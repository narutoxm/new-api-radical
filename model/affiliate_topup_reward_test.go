package model

import (
	"fmt"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func resetAffiliateTopUpRewardTest(t *testing.T) {
	t.Helper()
	tables := []string{
		"affiliate_top_up_rewards",
		"redemptions",
		"top_ups",
		"logs",
		"users",
	}
	for _, table := range tables {
		require.NoError(t, DB.Exec("DELETE FROM "+table).Error)
	}
	t.Cleanup(func() {
		for _, table := range tables {
			_ = DB.Exec("DELETE FROM " + table).Error
		}
	})
}

func withAffiliateRewardSettings(t *testing.T) {
	t.Helper()
	oldQuotaPerUnit := common.QuotaPerUnit
	oldQuotaForNewUser := common.QuotaForNewUser
	oldQuotaForInviter := common.QuotaForInviter
	oldQuotaForInvitee := common.QuotaForInvitee

	common.QuotaPerUnit = 1000
	common.QuotaForNewUser = 0
	common.QuotaForInviter = 1234
	common.QuotaForInvitee = 5678

	t.Cleanup(func() {
		common.QuotaPerUnit = oldQuotaPerUnit
		common.QuotaForNewUser = oldQuotaForNewUser
		common.QuotaForInviter = oldQuotaForInviter
		common.QuotaForInvitee = oldQuotaForInvitee
	})
}

func seedAffiliateUser(t *testing.T, id int, inviterId int) {
	t.Helper()
	user := &User{
		Id:         id,
		Username:   fmt.Sprintf("aff_user_%d", id),
		Password:   "password_hash",
		Status:     common.UserStatusEnabled,
		AffCode:    fmt.Sprintf("affcode%d", id),
		AffEnabled: true,
		InviterId:  inviterId,
	}
	require.NoError(t, DB.Create(user).Error)
}

func seedAffiliateRedemption(t *testing.T, id int, key string, quota int) {
	t.Helper()
	redemption := &Redemption{
		Id:          id,
		UserId:      1,
		Key:         key,
		Status:      common.RedemptionCodeStatusEnabled,
		Name:        "affiliate-test",
		Quota:       quota,
		CreatedTime: common.GetTimestamp(),
	}
	require.NoError(t, DB.Create(redemption).Error)
}

func getAffiliateUser(t *testing.T, id int) User {
	t.Helper()
	var user User
	require.NoError(t, DB.Where("id = ?", id).First(&user).Error)
	return user
}

func countAffiliateRewards(t *testing.T) int64 {
	t.Helper()
	var count int64
	require.NoError(t, DB.Model(&AffiliateTopUpReward{}).Count(&count).Error)
	return count
}

func TestAffiliateSignupDoesNotGrantQuota(t *testing.T) {
	resetAffiliateTopUpRewardTest(t)
	withAffiliateRewardSettings(t)

	seedAffiliateUser(t, 1, 0)

	invitee := &User{
		Username: "invited_signup",
		Password: "password123",
		AffCode:  "signupcode",
		Status:   common.UserStatusEnabled,
	}
	require.NoError(t, invitee.Insert(1))

	inviter := getAffiliateUser(t, 1)
	invitee = &User{Id: invitee.Id}
	require.NoError(t, DB.First(invitee).Error)

	assert.Equal(t, 1, inviter.AffCount)
	assert.Equal(t, 0, inviter.AffQuota)
	assert.Equal(t, 0, inviter.AffHistoryQuota)
	assert.Equal(t, 0, invitee.Quota)
	assert.Equal(t, 1, invitee.InviterId)
	assert.Equal(t, int64(0), countAffiliateRewards(t))
}

func TestAffiliateRedemptionRewardRequiresTopUpOver100(t *testing.T) {
	resetAffiliateTopUpRewardTest(t)
	withAffiliateRewardSettings(t)

	seedAffiliateUser(t, 1, 0)
	seedAffiliateUser(t, 2, 1)

	quota := int(common.QuotaPerUnit * 100)
	key := "0123456789abcdef0123456789abc001"
	seedAffiliateRedemption(t, 1, key, quota)

	redeemedQuota, err := Redeem(key, 2)
	require.NoError(t, err)
	assert.Equal(t, quota, redeemedQuota)
	assert.Equal(t, int64(0), countAffiliateRewards(t))
	assert.Equal(t, 0, getAffiliateUser(t, 1).AffQuota)
}

func TestAffiliateCodeRequiresEnabledInviter(t *testing.T) {
	resetAffiliateTopUpRewardTest(t)
	withAffiliateRewardSettings(t)

	seedAffiliateUser(t, 1, 0)
	require.NoError(t, DB.Model(&User{}).Where("id = ?", 1).Update("aff_enabled", false).Error)

	_, err := GetUserIdByAffCode("affcode1")
	require.Error(t, err)

	require.NoError(t, DB.Model(&User{}).Where("id = ?", 1).Update("aff_enabled", true).Error)
	inviterId, err := GetUserIdByAffCode("affcode1")
	require.NoError(t, err)
	assert.Equal(t, 1, inviterId)
}

func TestAffiliateRedemptionRewardRecordsDisplayOnlyImmediately(t *testing.T) {
	resetAffiliateTopUpRewardTest(t)
	withAffiliateRewardSettings(t)

	seedAffiliateUser(t, 1, 0)
	seedAffiliateUser(t, 2, 1)

	quota := int(common.QuotaPerUnit * 101)
	key := "0123456789abcdef0123456789abc002"
	seedAffiliateRedemption(t, 2, key, quota)

	redeemedQuota, err := Redeem(key, 2)
	require.NoError(t, err)
	assert.Equal(t, quota, redeemedQuota)

	var reward AffiliateTopUpReward
	require.NoError(t, DB.First(&reward).Error)
	assert.Equal(t, AffiliateTopUpRewardSourceRedemption, reward.SourceType)
	assert.Equal(t, 2, reward.RedemptionId)
	assert.Equal(t, quota, reward.TopUpQuota)
	assert.Equal(t, quota*15/100, reward.RewardQuota)
	assert.Equal(t, quota, reward.ConsumedQuota)
	assert.Equal(t, AffiliateTopUpRewardStatusPaid, reward.Status)
	assert.Greater(t, reward.PaidAt, int64(0))

	require.NoError(t, accrueAffiliateTopUpConsumption(2, quota-1))
	require.NoError(t, DB.First(&reward, reward.Id).Error)
	assert.Equal(t, quota, reward.ConsumedQuota)
	assert.Equal(t, AffiliateTopUpRewardStatusPaid, reward.Status)
	assert.Equal(t, 0, getAffiliateUser(t, 1).AffQuota)

	require.NoError(t, accrueAffiliateTopUpConsumption(2, 1))
	require.NoError(t, DB.First(&reward, reward.Id).Error)
	assert.Equal(t, quota, reward.ConsumedQuota)
	assert.Equal(t, AffiliateTopUpRewardStatusPaid, reward.Status)

	inviter := getAffiliateUser(t, 1)
	assert.Equal(t, 0, inviter.AffQuota)
	assert.Equal(t, reward.RewardQuota, inviter.AffHistoryQuota)
}

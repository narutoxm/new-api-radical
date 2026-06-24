package model

import (
	"fmt"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

const (
	AffiliateTopUpRewardStatusPending = "pending"
	AffiliateTopUpRewardStatusPaid    = "paid"
	AffiliateTopUpRewardStatusIgnored = "ignored"

	AffiliateTopUpRewardSourceTopUp      = "topup"
	AffiliateTopUpRewardSourceRedemption = "redemption"

	affiliateTopUpRewardMinAmount    = 100
	affiliateTopUpRewardRatioPercent = 15
)

type AffiliateTopUpReward struct {
	Id            int    `json:"id"`
	InviterId     int    `json:"inviter_id" gorm:"index"`
	InviteeId     int    `json:"invitee_id" gorm:"index"`
	SourceType    string `json:"source_type" gorm:"type:varchar(32);index"`
	SourceId      int    `json:"source_id" gorm:"index"`
	TopUpId       int    `json:"topup_id" gorm:"index"`
	RedemptionId  int    `json:"redemption_id" gorm:"index"`
	TradeNo       string `json:"trade_no" gorm:"type:varchar(255);index"`
	TopUpAmount   int64  `json:"topup_amount"`
	TopUpMoney    string `json:"topup_money" gorm:"type:varchar(64)"`
	TopUpQuota    int    `json:"topup_quota"`
	RewardQuota   int    `json:"reward_quota"`
	ConsumedQuota int    `json:"consumed_quota"`
	Status        string `json:"status" gorm:"type:varchar(32);default:'pending';index"`
	CreatedAt     int64  `json:"created_at" gorm:"autoCreateTime;column:created_at"`
	UpdatedAt     int64  `json:"updated_at" gorm:"autoUpdateTime;column:updated_at"`
	PaidAt        int64  `json:"paid_at"`
}

type affiliateTopUpRewardSource struct {
	InviteeId    int
	SourceType   string
	SourceId     int
	TopUpId      int
	RedemptionId int
	TradeNo      string
	QuotaToAdd   int
	Money        decimal.Decimal
}

func countInvitedUser(inviterId int) error {
	if inviterId <= 0 {
		return nil
	}
	return DB.Model(&User{}).Where("id = ?", inviterId).Update("aff_count", gorm.Expr("aff_count + ?", 1)).Error
}

func createAffiliateTopUpRewardTx(tx *gorm.DB, topUp *TopUp, quotaToAdd int) error {
	if topUp == nil {
		return nil
	}
	return createAffiliateTopUpRewardForSourceTx(tx, affiliateTopUpRewardSource{
		InviteeId:  topUp.UserId,
		SourceType: AffiliateTopUpRewardSourceTopUp,
		SourceId:   topUp.Id,
		TopUpId:    topUp.Id,
		TradeNo:    topUp.TradeNo,
		QuotaToAdd: quotaToAdd,
		Money:      decimal.NewFromFloat(topUp.Money),
	})
}

func createAffiliateRedemptionRewardTx(tx *gorm.DB, redemption *Redemption, userId int) error {
	if redemption == nil {
		return nil
	}
	return createAffiliateTopUpRewardForSourceTx(tx, affiliateTopUpRewardSource{
		InviteeId:    userId,
		SourceType:   AffiliateTopUpRewardSourceRedemption,
		SourceId:     redemption.Id,
		TopUpId:      -redemption.Id,
		RedemptionId: redemption.Id,
		TradeNo:      redemption.Key,
		QuotaToAdd:   redemption.Quota,
		Money:        decimal.Zero,
	})
}

func createAffiliateTopUpRewardForSourceTx(tx *gorm.DB, source affiliateTopUpRewardSource) error {
	if source.InviteeId == 0 || source.SourceType == "" || source.SourceId == 0 || source.QuotaToAdd <= 0 {
		return nil
	}
	topUpBaseAmount := decimal.NewFromInt(int64(source.QuotaToAdd)).Div(decimal.NewFromFloat(common.QuotaPerUnit))
	if !topUpBaseAmount.GreaterThan(decimal.NewFromInt(affiliateTopUpRewardMinAmount)) {
		return nil
	}

	var invitee User
	if err := tx.Select("id", "inviter_id").Where("id = ?", source.InviteeId).First(&invitee).Error; err != nil {
		return err
	}
	if invitee.InviterId <= 0 || invitee.InviterId == invitee.Id {
		return nil
	}

	rewardQuota := int(decimal.NewFromInt(int64(source.QuotaToAdd)).
		Mul(decimal.NewFromInt(affiliateTopUpRewardRatioPercent)).
		Div(decimal.NewFromInt(100)).
		IntPart())
	if rewardQuota <= 0 {
		return nil
	}

	reward := AffiliateTopUpReward{
		InviterId:     invitee.InviterId,
		InviteeId:     invitee.Id,
		SourceType:    source.SourceType,
		SourceId:      source.SourceId,
		TopUpId:       source.TopUpId,
		RedemptionId:  source.RedemptionId,
		TradeNo:       source.TradeNo,
		TopUpAmount:   topUpBaseAmount.IntPart(),
		TopUpMoney:    source.Money.String(),
		TopUpQuota:    source.QuotaToAdd,
		RewardQuota:   rewardQuota,
		ConsumedQuota: source.QuotaToAdd,
		Status:        AffiliateTopUpRewardStatusPaid,
		PaidAt:        common.GetTimestamp(),
	}
	if err := tx.Create(&reward).Error; err != nil {
		return err
	}
	if err := tx.Model(&User{}).Where("id = ?", invitee.InviterId).Update("aff_history", gorm.Expr("aff_history + ?", rewardQuota)).Error; err != nil {
		return err
	}

	RecordLog(invitee.InviterId, LogTypeSystem, fmt.Sprintf(
		"邀请用户充值展示奖励已记录，被邀请用户 %d 单笔充值 %s，展示收益 %s",
		invitee.Id,
		logger.LogQuota(source.QuotaToAdd),
		logger.LogQuota(rewardQuota),
	))
	return nil
}

func TrackAffiliateTopUpReward(topUp *TopUp, quotaToAdd int) error {
	return DB.Transaction(func(tx *gorm.DB) error {
		return createAffiliateTopUpRewardTx(tx, topUp, quotaToAdd)
	})
}

func AccrueAffiliateTopUpConsumption(userId int, quota int) {
	// Referral rewards are display-only and are recorded when the invitee tops up.
}

func accrueAffiliateTopUpConsumption(userId int, quota int) error {
	return nil
}

type affiliateRewardConsumeResult struct {
	consumed int
	reward   *AffiliateTopUpReward
}

func accrueNextAffiliateTopUpReward(userId int, quota int) (affiliateRewardConsumeResult, error) {
	return affiliateRewardConsumeResult{}, nil
}

package model

import (
	"errors"
	"net"
	"strings"

	"github.com/QuantumNous/new-api/common"
)

type AffiliateSite struct {
	Id          int    `json:"id"`
	Domain      string `json:"domain" gorm:"type:varchar(255);uniqueIndex"`
	InviterId   int    `json:"inviter_id" gorm:"index"`
	Description string `json:"description" gorm:"type:varchar(255)"`
	Enabled     bool   `json:"enabled" gorm:"default:true;index"`
	CreatedAt   int64  `json:"created_at" gorm:"autoCreateTime;column:created_at"`
	UpdatedAt   int64  `json:"updated_at" gorm:"autoUpdateTime;column:updated_at"`
}

type AffiliateOverviewUser struct {
	Id          int    `json:"id"`
	Username    string `json:"username"`
	DisplayName string `json:"display_name"`
	Email       string `json:"email"`
	Group       string `json:"group"`
	Status      int    `json:"status"`
	Quota       int    `json:"quota"`
	UsedQuota   int    `json:"used_quota"`
	CreatedAt   int64  `json:"created_at"`
}

type AffiliateOverviewSite struct {
	Domain      string `json:"domain"`
	Description string `json:"description"`
}

type AffiliateOverviewStats struct {
	InvitedCount      int64   `json:"invited_count"`
	TotalTopUpMoney   float64 `json:"total_topup_money"`
	TotalTopUpQuota   int64   `json:"total_topup_quota"`
	TotalUsedQuota    int64   `json:"total_used_quota"`
	RewardQuota       int     `json:"reward_quota"`
	AffiliateCode     string  `json:"affiliate_code"`
	AffiliateEnabled  bool    `json:"affiliate_enabled"`
	CurrentOriginSite string  `json:"current_origin_site"`
}

type AffiliateOverview struct {
	Stats AffiliateOverviewStats   `json:"stats"`
	Sites []AffiliateOverviewSite  `json:"sites"`
	Users []*AffiliateOverviewUser `json:"users"`
}

func NormalizeAffiliateSiteDomain(domain string) string {
	domain = strings.TrimSpace(strings.ToLower(domain))
	domain = strings.TrimPrefix(domain, "http://")
	domain = strings.TrimPrefix(domain, "https://")
	domain = strings.TrimSuffix(domain, "/")
	if host, _, err := net.SplitHostPort(domain); err == nil {
		domain = host
	}
	return domain
}

func GetAffiliateSiteByDomain(domain string) (*AffiliateSite, error) {
	domain = NormalizeAffiliateSiteDomain(domain)
	if domain == "" {
		return nil, errors.New("domain is empty")
	}
	var site AffiliateSite
	err := DB.Where("domain = ? AND enabled = ?", domain, true).First(&site).Error
	return &site, err
}

func GetAffiliateSiteInviterIdByHost(host string) int {
	site, err := GetAffiliateSiteByDomain(host)
	if err != nil || site == nil || site.InviterId <= 0 {
		return 0
	}
	if !affiliateSiteInviterExists(site.InviterId) {
		return 0
	}
	return site.InviterId
}

func ResolveRegistrationInviterId(affCode string, host string) int {
	if inviterId := GetAffiliateSiteInviterIdByHost(host); inviterId > 0 {
		return inviterId
	}
	inviterId, err := GetUserIdByAffCode(affCode)
	if err != nil {
		return 0
	}
	return inviterId
}

func ListAffiliateSites() ([]*AffiliateSite, error) {
	var sites []*AffiliateSite
	err := DB.Order("id desc").Find(&sites).Error
	return sites, err
}

func CreateAffiliateSite(site *AffiliateSite) error {
	if site == nil {
		return errors.New("site is nil")
	}
	site.Domain = NormalizeAffiliateSiteDomain(site.Domain)
	if site.Domain == "" || site.InviterId <= 0 {
		return errors.New("domain and inviter_id are required")
	}
	if !affiliateSiteInviterExists(site.InviterId) {
		return errors.New("inviter user does not exist or is disabled")
	}
	site.Enabled = true
	return DB.Create(site).Error
}

func UpdateAffiliateSite(site *AffiliateSite) error {
	if site == nil || site.Id <= 0 {
		return errors.New("site id is required")
	}
	site.Domain = NormalizeAffiliateSiteDomain(site.Domain)
	if site.Domain == "" || site.InviterId <= 0 {
		return errors.New("domain and inviter_id are required")
	}
	if !affiliateSiteInviterExists(site.InviterId) {
		return errors.New("inviter user does not exist or is disabled")
	}
	updates := map[string]interface{}{
		"domain":      site.Domain,
		"inviter_id":  site.InviterId,
		"description": site.Description,
		"enabled":     site.Enabled,
	}
	return DB.Model(&AffiliateSite{}).Where("id = ?", site.Id).Updates(updates).Error
}

func affiliateSiteInviterExists(inviterId int) bool {
	if inviterId <= 0 {
		return false
	}
	var user User
	err := DB.Select("id").Where("id = ? AND status = ?", inviterId, common.UserStatusEnabled).First(&user).Error
	return err == nil
}

func DeleteAffiliateSite(id int) error {
	if id <= 0 {
		return errors.New("site id is required")
	}
	return DB.Delete(&AffiliateSite{}, "id = ?", id).Error
}

func GetAffiliateOverview(inviterId int, pageInfo *common.PageInfo) (*AffiliateOverview, int64, error) {
	if inviterId <= 0 {
		return nil, 0, errors.New("inviter id is required")
	}
	var inviter User
	if err := DB.Select("id", "aff_code", "aff_count", "aff_history", "aff_enabled").Where("id = ?", inviterId).First(&inviter).Error; err != nil {
		return nil, 0, err
	}

	var sites []*AffiliateSite
	if err := DB.Where("inviter_id = ? AND enabled = ?", inviterId, true).Order("id desc").Find(&sites).Error; err != nil {
		return nil, 0, err
	}
	overviewSites := make([]AffiliateOverviewSite, 0, len(sites))
	for _, site := range sites {
		overviewSites = append(overviewSites, AffiliateOverviewSite{
			Domain:      site.Domain,
			Description: site.Description,
		})
	}

	var total int64
	query := DB.Model(&User{}).Where("inviter_id = ?", inviterId)
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var users []*AffiliateOverviewUser
	if err := query.Order("id desc").Limit(pageInfo.GetPageSize()).Offset(pageInfo.GetStartIdx()).Find(&users).Error; err != nil {
		return nil, 0, err
	}
	for _, user := range users {
		user.Email = common.MaskEmail(user.Email)
	}

	var topUpAgg struct {
		TotalMoney float64
		TotalQuota int64
	}
	if err := DB.Model(&TopUp{}).
		Select("COALESCE(SUM(money), 0) AS total_money, COALESCE(SUM(amount), 0) AS total_quota").
		Where("status = ? AND user_id IN (?)", common.TopUpStatusSuccess, DB.Model(&User{}).Select("id").Where("inviter_id = ?", inviterId)).
		Scan(&topUpAgg).Error; err != nil {
		return nil, 0, err
	}

	var usedQuota int64
	if err := DB.Model(&User{}).Where("inviter_id = ?", inviterId).Select("COALESCE(SUM(used_quota), 0)").Scan(&usedQuota).Error; err != nil {
		return nil, 0, err
	}

	return &AffiliateOverview{
		Stats: AffiliateOverviewStats{
			InvitedCount:     total,
			TotalTopUpMoney:  topUpAgg.TotalMoney,
			TotalTopUpQuota:  topUpAgg.TotalQuota,
			TotalUsedQuota:   usedQuota,
			RewardQuota:      inviter.AffHistoryQuota,
			AffiliateCode:    inviter.AffCode,
			AffiliateEnabled: inviter.AffEnabled,
		},
		Sites: overviewSites,
		Users: users,
	}, total, nil
}

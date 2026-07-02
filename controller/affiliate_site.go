package controller

import (
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"

	"github.com/gin-gonic/gin"
)

func resolveRegistrationInviterId(c *gin.Context, affCode string) int {
	return model.ResolveRegistrationInviterId(affCode, currentRequestHost(c))
}

func currentRequestHost(c *gin.Context) string {
	host := strings.TrimSpace(c.GetHeader("X-Forwarded-Host"))
	if host == "" {
		host = c.Request.Host
	}
	if parts := strings.Split(host, ","); len(parts) > 0 {
		host = strings.TrimSpace(parts[0])
	}
	return host
}

func isAffiliateSiteRequest(c *gin.Context) bool {
	return model.GetAffiliateSiteInviterIdByHost(currentRequestHost(c)) > 0
}

func GetAffiliateOverview(c *gin.Context) {
	userId := c.GetInt("id")
	pageInfo := common.GetPageQuery(c)
	overview, total, err := model.GetAffiliateOverview(userId, pageInfo)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(overview.Users)
	overview.Users = nil
	common.ApiSuccess(c, gin.H{
		"stats": overview.Stats,
		"sites": overview.Sites,
		"users": pageInfo,
	})
}

func GetAffiliateSites(c *gin.Context) {
	sites, err := model.ListAffiliateSites()
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, sites)
}

func CreateAffiliateSite(c *gin.Context) {
	var site model.AffiliateSite
	if err := common.DecodeJson(c.Request.Body, &site); err != nil {
		common.ApiError(c, err)
		return
	}
	if err := model.CreateAffiliateSite(&site); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, site)
}

func UpdateAffiliateSite(c *gin.Context) {
	var site model.AffiliateSite
	if err := common.DecodeJson(c.Request.Body, &site); err != nil {
		common.ApiError(c, err)
		return
	}
	if err := model.UpdateAffiliateSite(&site); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, site)
}

func DeleteAffiliateSite(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if err := model.DeleteAffiliateSite(id); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, nil)
}

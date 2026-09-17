package controllers

import "context"

type HealthController struct{}

func NewHealthController() *HealthController {
	return &HealthController{}
}

// LivenessOutput answers only "is this process running". It deliberately
// reports nothing about dependencies: an orchestrator kills a process that
// fails its liveness probe, so a brief database outage must not fail this.
type LivenessOutput struct {
	Body struct {
		Status string `json:"status" example:"ok"`
	}
}

func (c *HealthController) Liveness(_ context.Context, _ *struct{}) (*LivenessOutput, error) {
	out := &LivenessOutput{}
	out.Body.Status = "ok"
	return out, nil
}

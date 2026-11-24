package controllers

import (
	"reflect"

	"github.com/danielgtaylor/huma/v2"
	"github.com/google/uuid"
)

// OptionalParam is a query param that records whether the request sent it. huma has no pointer params, so a plain
// field can't tell a param left out from one sent as its zero value, such as the nil UUID.
type OptionalParam[T any] struct {
	Value T
	IsSet bool
}

// huma finds these through reflection, so the assertions are the only compile-time check.
var (
	_ huma.ParamWrapper   = (*OptionalParam[uuid.UUID])(nil)
	_ huma.ParamReactor   = (*OptionalParam[uuid.UUID])(nil)
	_ huma.SchemaProvider = (*OptionalParam[uuid.UUID])(nil)
)

// Schema is Value's schema. Without it, huma documents and validates the param as this struct, an object.
func (param *OptionalParam[T]) Schema(r huma.Registry) *huma.Schema {
	return huma.SchemaFromType(r, reflect.TypeFor[T]())
}

// Receiver is the field huma parses the param into.
func (param *OptionalParam[T]) Receiver() reflect.Value {
	return reflect.ValueOf(param).Elem().Field(0)
}

// OnParamSet records whether the request sent the param.
func (param *OptionalParam[T]) OnParamSet(isSet bool, _ any) {
	param.IsSet = isSet
}

// Pointer is the param's value, or nil when the request left it out.
func (param *OptionalParam[T]) Pointer() *T {
	if !param.IsSet {
		return nil
	}
	return &param.Value
}

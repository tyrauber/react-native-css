import type { ComponentType } from "react";

// Flag to mark components that already handle className natively
export const __REACT_NATIVE_CSS_STYLED__ = "__REACT_NATIVE_CSS_STYLED__";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComponent = ComponentType<any>;

export function copyComponentProperties<T extends AnyComponent>(
  BaseComponent: T,
  Component: AnyComponent,
) {
  for (const [key, value] of Object.entries(BaseComponent)) {
    if (key === "$$typeof" || key === "render" || key === "contextType") {
      continue;
    }

    (Component as unknown as Record<string, unknown>)[key] = value;
  }

  Component.displayName = BaseComponent.displayName;

  // Mark this component as pre-styled so jsx-runtime can skip transformation
  (Component as unknown as Record<string, unknown>)[
    __REACT_NATIVE_CSS_STYLED__
  ] = true;

  return Component as unknown as T;
}

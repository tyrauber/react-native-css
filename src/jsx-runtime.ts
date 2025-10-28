/* eslint-disable */
import React from "react";

// Global registry for styled components
const globalStyledRegistryContainer = {
  registry: new WeakMap<any, any>(),
};

/**
 * Register a component in the global styled registry
 * This is called by styled() when global: true (default)
 */
export function registerStyledComponent(
  originalComponent: any,
  styledComponent: any,
): void {
  globalStyledRegistryContainer.registry.set(
    originalComponent,
    styledComponent,
  );
}

/**
 * Check if a component is registered in the global styled registry
 */
export function isComponentStyled(component: any): boolean {
  return globalStyledRegistryContainer.registry.has(component);
}

/**
 * Get the styled version of a component from the global registry
 */
export function getStyledComponent(component: any): any {
  return globalStyledRegistryContainer.registry.get(component);
}

/**
 * Clear the global styled registry (useful for testing)
 */
export function clearStyledRegistry(): void {
  // Create a new WeakMap to clear all references
  globalStyledRegistryContainer.registry = new WeakMap<any, any>();
}

/**
 * Custom JSX factory that automatically applies global styled components
 * This is the core function that intercepts all JSX creation
 */
function jsxWithGlobalStyling(
  type: React.ComponentType<any> | string,
  props: any,
  key?: React.Key,
): React.ReactElement {
  // Check if this component has been globally registered with styled()
  if (
    typeof type === "function" ||
    (type && typeof type === "object" && (type as any).$$typeof)
  ) {
    const styledVersion = globalStyledRegistryContainer.registry.get(type);

    // If we have a styled version and the props include className, use the styled version
    if (styledVersion && props && (props as any).className) {
      return React.createElement(styledVersion, { ...props, key } as any);
    }
  }

  // Use the original component
  return React.createElement(type as any, { ...props, key } as any);
}

/**
 * JSX factory function (React 17+ automatic runtime)
 * This gets called for every JSX element: <Component />
 */
export function jsx(
  type: React.ComponentType<any> | string,
  props: any,
  key?: React.Key,
): React.ReactElement {
  return jsxWithGlobalStyling(type, props, key);
}

/**
 * JSX factory function for elements with children (React 17+ automatic runtime)
 * This gets called for JSX elements with children: <Component>...</Component>
 */
export function jsxs(
  type: React.ComponentType<any> | string,
  props: any,
  key?: React.Key,
): React.ReactElement {
  return jsxWithGlobalStyling(type, props, key);
}

/**
 * Fragment factory (React 17+ automatic runtime)
 */
export { Fragment } from "react";

/**
 * JSX factory function for development mode (includes additional debug info)
 */
export function jsxDEV(
  type: React.ComponentType<any> | string,
  props: any,
  key?: React.Key,
  _isStaticChildren?: boolean,
  _source?: any,
  _self?: any,
): React.ReactElement {
  return jsxWithGlobalStyling(type, props, key);
}

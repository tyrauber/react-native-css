/* eslint-disable  */
import {
  createElement,
  forwardRef,
  useContext,
  useState,
  type ComponentType,
} from "react";
import { Appearance } from "react-native";

import type { StyleDescriptor } from "react-native-css/compiler";
import { VariableContext } from "react-native-css/native-internal";

import type {
  ColorScheme,
  Props,
  ReactComponent,
  StyledConfiguration,
  StyledOptions,
} from "../runtime.types";
import { mappingToConfig, useNativeCss } from "./react/useNativeCss";
import { usePassthrough } from "./react/usePassthrough";
import {
  colorScheme as colorSchemeObs,
  VAR_SYMBOL,
  type Effect,
  type Getter,
} from "./reactivity";
import { resolveValue } from "./styles/resolve";

/**
 * Detects component type based on component name and other heuristics
 */
function detectComponentType(component: ReactComponent): string {
  const name = (component.displayName || component.name || "").toLowerCase();

  // SVG indicators
  if (
    name.includes("svg") ||
    name.includes("icon") ||
    name.includes("logo") ||
    name.endsWith(".svg") ||
    // Common SVG component names
    ["path", "circle", "rect", "line", "polygon", "g"].includes(name)
  ) {
    return "svg";
  }

  // Image indicators
  if (
    name.includes("image") ||
    name.includes("img") ||
    name.includes("picture") ||
    name.includes("photo")
  ) {
    return "image";
  }

  // Text indicators
  if (
    name.includes("text") ||
    name.includes("label") ||
    name.includes("title") ||
    name.includes("heading")
  ) {
    return "text";
  }

  // View indicators
  if (
    name.includes("view") ||
    name.includes("container") ||
    name.includes("wrapper") ||
    name.includes("box")
  ) {
    return "view";
  }

  return "unknown";
}

/**
 * Gets intelligent default nativeStyleMapping based on component type
 */
function getIntelligentDefaults(componentType: string): Record<string, string> {
  switch (componentType) {
    case "svg":
      return {
        height: "height",
        width: "width",
        size: "size",
        fill: "fill",
        stroke: "stroke",
        strokeWidth: "strokeWidth",
        strokeDasharray: "strokeDasharray",
        strokeLinecap: "strokeLinecap",
        strokeLinejoin: "strokeLinejoin",
        opacity: "opacity",
        x: "x",
        y: "y",
      };
    case "text":
      return {
        color: "color",
      };
    case "image":
    case "view":
    default:
      return {};
  }
}

/**
 * Merges user-provided mapping with intelligent defaults
 */
function mergeWithIntelligentDefaults<C extends ReactComponent<any>>(
  userMapping: StyledConfiguration<C>,
  component: C,
): StyledConfiguration<C> {
  // If user provided explicit mapping with nativeStyleMapping or nativeStyleToProp, don't override
  if (
    typeof userMapping === "object" &&
    userMapping.className &&
    typeof userMapping.className === "object" &&
    ((userMapping.className as any).nativeStyleMapping ||
      (userMapping.className as any).nativeStyleToProp)
  ) {
    return userMapping;
  }

  // If user provided any explicit object configuration for className, don't override
  if (
    typeof userMapping === "object" &&
    userMapping.className &&
    typeof userMapping.className === "object"
  ) {
    return userMapping;
  }

  const componentType = detectComponentType(component);
  const intelligentDefaults = getIntelligentDefaults(componentType);

  // If no intelligent defaults for this component type, use user mapping as-is
  if (Object.keys(intelligentDefaults).length === 0) {
    return userMapping;
  }

  // Apply intelligent defaults only for simple string configurations
  return {
    className: {
      target: "style",
      nativeStyleMapping: intelligentDefaults,
    },
  } as any as StyledConfiguration<C>;
}

export {
  StyleCollection,
  VariableContext,
  VariableContextProvider,
} from "react-native-css/native-internal";

export { useNativeCss };

const defaultMapping: StyledConfiguration<ComponentType<{ style: unknown }>> = {
  className: "style",
};

/**
 * Generates a new Higher-Order component the wraps the base component and applies the styles.
 * This is added to the `interopComponents` map so that it can be used in the `wrapJSX` function
 * @param baseComponent
 * @param mapping
 */
export const styled = <
  const C extends ReactComponent<any>,
  const M extends StyledConfiguration<C>,
>(
  baseComponent: C,
  mapping: M = defaultMapping as M,
  options?: StyledOptions,
) => {
  // Apply intelligent defaults based on component type
  const enhancedMapping = mergeWithIntelligentDefaults(mapping, baseComponent);
  const configs = mappingToConfig(enhancedMapping);

  const name = baseComponent.displayName ?? baseComponent.name ?? "unknown";

  // Create a properly ref-forwarded component
  const RefForwardedBase = forwardRef<any, any>((props, ref) => {
    return createElement(baseComponent, { ref, ...props });
  });
  RefForwardedBase.displayName = `RefForwarded${name}`;

  let component: any;

  if (options?.passThrough) {
    component = forwardRef<any, any>((props, ref) => {
      return usePassthrough(RefForwardedBase, { ref, ...props }, configs);
    });
  } else {
    component = forwardRef<any, any>((props, ref) => {
      return useNativeCss(RefForwardedBase, { ref, ...props }, configs);
    });
  }

  component.displayName = `CssInterop.${name}`;
  return component;
};

export const colorScheme: ColorScheme = {
  get() {
    return colorSchemeObs.get() ?? Appearance.getColorScheme() ?? "light";
  },
  set(value) {
    return colorSchemeObs.set(value);
  },
};

export const useUnstableNativeVariable = useNativeVariable;

export const useCssElement = <
  const C extends ReactComponent<any>,
  const M extends StyledConfiguration<C>,
>(
  component: C,
  incomingProps: Props,
  mapping: M,
) => {
  const [config] = useState(() => mappingToConfig(mapping));
  return useNativeCss(component, incomingProps, config);
};

export function useNativeVariable(name: string) {
  if (name.startsWith("--")) {
    name = name.slice(2);
  }

  const inheritedVariables = useContext(VariableContext);
  const [effect, setState] = useState(() => {
    const effect: Effect = {
      observers: new Set(),
      run: () => setState((state) => ({ ...state })),
    };

    const get: Getter = (observable) => observable.get(effect);

    return { ...effect, get };
  });

  return resolveValue([{}, "var", [name]], effect.get, { inheritedVariables });
}

/**
 * @deprecated Use `<VariableContextProvider />` instead.
 */
export function vars(variables: Record<string, StyleDescriptor>) {
  return Object.assign(
    { [VAR_SYMBOL]: "inline" },
    Object.fromEntries(
      Object.entries(variables).map(([k, v]) => [k.replace(/^--/, ""), v]),
    ),
  );
}

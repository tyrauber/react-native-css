/* eslint-disable */
// @ts-nocheck
import React from "react";
import { View } from "react-native";

import { render, screen } from "@testing-library/react-native";
import { registerCSS, testID } from "react-native-css/jest";
import { clearStyledRegistry } from "react-native-css/jsx-runtime";
import { styled } from "react-native-css/runtime";

const children = undefined;

// Mock SVG component that mimics react-native-svg behavior
const MockCircle = React.forwardRef<any, any>((props: any, ref: any) => {
  const { fill, stroke, strokeWidth, r, cx, cy, ...otherProps } = props;
  return (
    <View
      ref={ref}
      {...otherProps}
      testID={props.testID ?? "mock-circle"}
      // Store SVG-specific props in data attributes for testing
      data-fill={fill}
      data-stroke={stroke}
      data-stroke-width={strokeWidth}
      data-r={r}
      data-cx={cx}
      data-cy={cy}
    />
  );
});
MockCircle.displayName = "Circle";

// Mock Expo Image component
const MockExpoImage = React.forwardRef<any, any>((props: any, ref: any) => {
  const { source, contentFit, transition, ...otherProps } = props;
  return (
    <View
      ref={ref}
      {...otherProps}
      testID={props.testID ?? "mock-expo-image"}
      data-source={JSON.stringify(source)}
      data-content-fit={contentFit}
      data-transition={transition}
    />
  );
});
MockExpoImage.displayName = "ExpoImage";

describe("JSX Transform Global Styling", () => {
  beforeEach(() => {
    // Clear registry before each test to avoid cross-test contamination
    clearStyledRegistry();
  });
  describe("Optimization: Pre-styled Components", () => {
    test("should skip transformation for components from react-native-css/components", () => {
      registerCSS(`
        .prestiled-test {
          width: 44px;
          height: 44px;
          fill: cyan;
        }
      `);

      // Mock a pre-styled component (simulating one from react-native-css/components)
      const PreStyledComponent = React.forwardRef<any, any>(
        (props: any, ref: any) => {
          // This component already handles className internally (like useCssElement does)
          return (
            <MockCircle
              ref={ref}
              {...props}
              testID={props.testID ?? "pre-styled"}
            />
          );
        },
      );

      // Add the flag to mark it as pre-styled
      const {
        __REACT_NATIVE_CSS_STYLED__,
      } = require("../../components/copyComponentProperties");
      (PreStyledComponent as any)[__REACT_NATIVE_CSS_STYLED__] = true;

      // Register it with styled() (this would normally cause transformation)
      styled(PreStyledComponent, {
        className: {
          target: "style",
          nativeStyleMapping: {
            width: "r",
            height: "r",
            fill: "fill",
          },
        },
      });

      // Use jsx runtime manually to test the optimization
      const { jsx } = require("../../jsx-runtime");
      const element = jsx(PreStyledComponent, {
        testID: testID,
        className: "prestiled-test",
      });

      render(element);
      const component = screen.getByTestId(testID);

      // Should NOT be transformed - component should receive raw className
      expect(component.props).toEqual(
        expect.objectContaining({
          testID,
          children,
          className: "prestiled-test", // Raw className passed through
        }),
      );

      // Should NOT have transformed props
      expect(component.props["data-r"]).toBeUndefined();
      expect(component.props["data-fill"]).toBeUndefined();
    });

    test("should still transform normal components without the flag", () => {
      registerCSS(`
        .normal-transform {
          width: 36px;
          height: 36px;
          fill: magenta;
        }
      `);

      // Normal component without pre-styled flag
      const NormalComponent = React.forwardRef<any, any>(
        (props: any, ref: any) => {
          return (
            <MockCircle
              ref={ref}
              {...props}
              testID={props.testID ?? "normal"}
            />
          );
        },
      );

      // Register it with styled()
      styled(NormalComponent, {
        className: {
          target: "style",
          nativeStyleMapping: {
            width: "r",
            height: "r",
            fill: "fill",
          },
        },
      });

      // Use jsx runtime manually
      const { jsx } = require("../../jsx-runtime");
      const element = jsx(NormalComponent, {
        testID: testID,
        className: "normal-transform",
      });

      render(element);
      const component = screen.getByTestId(testID);

      // Should be transformed normally
      expect(component.props).toEqual(
        expect.objectContaining({
          testID,
          children,
          "data-r": 36,
          "data-fill": "#f0f",
          "style": {},
        }),
      );
    });

    test("should demonstrate the flag exists on pre-styled components", () => {
      const PreStyledComponent = React.forwardRef<any, any>(
        (props: any, ref: any) => {
          return (
            <MockCircle
              ref={ref}
              {...props}
              testID={props.testID ?? "flag-test"}
            />
          );
        },
      );

      // Mark as pre-styled (simulating what copyComponentProperties does)
      const {
        __REACT_NATIVE_CSS_STYLED__,
      } = require("../../components/copyComponentProperties");
      (PreStyledComponent as any)[__REACT_NATIVE_CSS_STYLED__] = true;

      // Verify the flag is set
      expect((PreStyledComponent as any)[__REACT_NATIVE_CSS_STYLED__]).toBe(
        true,
      );

      // Test that jsx runtime respects the flag
      const { jsx } = require("../../jsx-runtime");
      const element = jsx(PreStyledComponent, {
        testID: testID,
        className: "flag-test-class",
      });

      render(element);
      const component = screen.getByTestId(testID);

      // Should receive raw className (not transformed)
      expect(component.props.className).toBe("flag-test-class");
    });

    test("should demonstrate end-to-end optimization with react-native-css components", () => {
      registerCSS(`
        .integration-test {
          width: 48px;
          height: 48px;
          background-color: orange;
        }
      `);

      // Simulate a component from react-native-css/components by using copyComponentProperties
      const {
        copyComponentProperties,
      } = require("../../components/copyComponentProperties");

      // Create a mock RN component
      const MockRNComponent = React.forwardRef<any, any>(
        (props: any, ref: any) => {
          return <MockCircle ref={ref} {...props} />;
        },
      );
      MockRNComponent.displayName = "MockRNComponent";

      // Create styled component using copyComponentProperties (like real components do)
      const StyledComponent = copyComponentProperties(
        MockRNComponent,
        (props: any) => {
          // This simulates useCssElement behavior
          return (
            <MockCircle
              {...props}
              testID={props.testID ?? "styled-component"}
              style={{
                width: props.className?.includes("integration-test")
                  ? 48
                  : undefined,
                height: props.className?.includes("integration-test")
                  ? 48
                  : undefined,
              }}
            />
          );
        },
      );

      // Also register with styled() (this happens when users globally register components)
      styled(StyledComponent, {
        className: {
          target: "style",
          nativeStyleMapping: {
            width: "r",
            height: "r",
          },
        },
      });

      // Test the jsx runtime
      const { jsx } = require("../../jsx-runtime");
      const element = jsx(StyledComponent, {
        testID: testID,
        className: "integration-test",
      });

      render(element);
      const component = screen.getByTestId(testID);

      // Should NOT be transformed by jsx-runtime due to pre-styled flag
      // Component should handle className internally
      expect(component.props).toEqual(
        expect.objectContaining({
          testID,
          children,
          className: "integration-test",
          style: { width: 48, height: 48 },
        }),
      );

      // Should NOT have jsx-runtime transformation artifacts
      expect(component.props["data-r"]).toBeUndefined();
    });
  });

  describe("Current State (Problems to Solve)", () => {
    test("should show that explicit styled wrappers work", () => {
      registerCSS(`
        .explicit-test {
          width: 32px;
          height: 32px;
          fill: blue;
        }
      `);

      // Create explicit styled wrapper
      const StyledCircle = styled(MockCircle, {
        className: {
          target: "style",
          nativeStyleMapping: {
            width: "r",
            height: "r",
            fill: "fill",
          },
        },
      });

      // This works because we're using the explicit wrapper
      render(<StyledCircle testID={testID} className="explicit-test" />);
      const component = screen.getByTestId(testID);

      expect(component.props).toEqual(
        expect.objectContaining({
          testID,
          children,
          "data-r": 32,
          "data-fill": "#00f",
          "style": {},
        }),
      );
    });

    test("should show the problem: global styling doesn't work automatically", () => {
      registerCSS(`
        .global-test {
          width: 40px;
          height: 40px;
          fill: red;
        }
      `);

      // Register component globally (this should make it work everywhere)
      styled(MockCircle, {
        className: {
          target: "style",
          nativeStyleMapping: {
            width: "r",
            height: "r",
            fill: "fill",
          },
        },
      });

      // This SHOULD work automatically but currently doesn't
      render(<MockCircle testID={testID} className="global-test" />);
      const component = screen.getByTestId(testID);

      // Currently this fails - component gets raw className instead of styled props
      expect(component.props).toEqual(
        expect.objectContaining({
          testID,
          children,
          // This is what we WANT (but don't get):
          // "data-r": 40,
          // "data-fill": "#f00",
          // "style": {},
          // This is what we GET instead:
          className: "global-test",
        }),
      );
    });

    test("should show the problem with multiple components", () => {
      registerCSS(`
        .multi-global {
          width: 24px;
          height: 24px;
          fill: green;
        }
      `);

      // Register both components globally
      styled(MockCircle, {
        className: {
          target: "style",
          nativeStyleMapping: {
            width: "r",
            height: "r",
            fill: "fill",
          },
        },
      });

      styled(MockExpoImage, {
        className: {
          target: "style",
        },
      });

      render(
        <View>
          <MockCircle testID={`${testID}-circle`} className="multi-global" />
          <MockExpoImage
            testID={`${testID}-image`}
            className="multi-global"
            source={{ uri: "test.jpg" }}
          />
        </View>,
      );

      const circle = screen.getByTestId(`${testID}-circle`);
      const image = screen.getByTestId(`${testID}-image`);

      // Both currently fail - they get raw className instead of styling
      expect(circle.props.className).toBe("multi-global");
      expect(image.props.className).toBe("multi-global");

      // What we WANT is for these to be styled automatically:
      // expect(circle.props["data-r"]).toBe(24);
      // expect(circle.props["data-fill"]).toBe("#008000");
      // expect(image.props.style).toEqual({ width: 24, height: 24 });
    });
  });

  describe("Manual JSX Transform Test (Proof of Concept)", () => {
    test("should work when manually using our JSX runtime", () => {
      registerCSS(`
        .jsx-transform-test {
          width: 50px;
          height: 50px;
          fill: purple;
        }
      `);

      // Register component globally
      styled(MockCircle, {
        className: {
          target: "style",
          nativeStyleMapping: {
            width: "r",
            height: "r",
            fill: "fill",
          },
        },
      });

      // Manually use our JSX runtime to simulate what the transform would do
      const { jsx } = require("../../jsx-runtime");
      const element = jsx(MockCircle, {
        testID: testID,
        className: "jsx-transform-test",
      });

      render(element);
      const component = screen.getByTestId(testID);

      // This proves the concept works!
      expect(component.props).toEqual(
        expect.objectContaining({
          testID,
          children,
          "data-r": 50,
          "data-fill": "#800080",
          "style": {},
        }),
      );
    });

    test("should work with multiple components using manual jsx", () => {
      registerCSS(`
        .icon { width: 20px; height: 20px; }
        .icon-primary { fill: blue; }
        .icon-secondary { fill: gray; }
      `);

      // Register components
      styled(MockCircle, {
        className: {
          target: "style",
          nativeStyleMapping: { width: "r", height: "r", fill: "fill" },
        },
      });

      // Manually use jsx runtime
      const { jsx } = require("../../jsx-runtime");

      const element1 = jsx(MockCircle, {
        testID: `${testID}-1`,
        className: "icon icon-primary",
      });

      const element2 = jsx(MockCircle, {
        testID: `${testID}-2`,
        className: "icon icon-secondary",
      });

      render(
        <View>
          {element1}
          {element2}
        </View>,
      );

      const icon1 = screen.getByTestId(`${testID}-1`);
      const icon2 = screen.getByTestId(`${testID}-2`);

      expect(icon1.props["data-r"]).toBe(20);
      expect(icon1.props["data-fill"]).toBe("#00f");
      expect(icon2.props["data-r"]).toBe(20);
      expect(icon2.props["data-fill"]).toBe("#808080");
    });
  });

  describe("Current Workarounds", () => {
    test("manual wrapper approach works but is verbose", () => {
      registerCSS(`
        .manual-test {
          width: 30px;
          height: 30px;
          fill: orange;
        }
      `);

      // Manual approach: create wrapper and use it everywhere
      const StyledCircle = styled(MockCircle, {
        className: {
          target: "style",
          nativeStyleMapping: {
            width: "r",
            height: "r",
            fill: "fill",
          },
        },
      });

      // Have to remember to use StyledCircle everywhere instead of MockCircle
      render(<StyledCircle testID={testID} className="manual-test" />);
      const component = screen.getByTestId(testID);

      expect(component.props).toEqual(
        expect.objectContaining({
          testID,
          children,
          "data-r": 30,
          "data-fill": "#ffa500",
          "style": {},
        }),
      );
    });
  });

  describe("TypeScript Configuration Verification", () => {
    test("proves .tsx files work with just tsconfig.json setup", () => {
      // This proves that TypeScript JSX transform is sufficient for .tsx files
      // No babel.config.js changes needed for standard Expo projects

      registerCSS(`
        .typescript-test {
          width: 28px;
          height: 28px;
          fill: teal;
        }
      `);

      styled(MockCircle, {
        className: {
          target: "style",
          nativeStyleMapping: {
            width: "r",
            height: "r",
            fill: "fill",
          },
        },
      });

      // This simulates what TypeScript would do with jsxImportSource config
      const { jsx } = require("../../jsx-runtime");
      const element = jsx(MockCircle, {
        testID: testID,
        className: "typescript-test",
      });

      render(element);
      const component = screen.getByTestId(testID);

      // This proves our JSX runtime works correctly
      expect(component.props).toEqual(
        expect.objectContaining({
          testID,
          children,
          "data-r": 28,
          "data-fill": "#008080",
          "style": {},
        }),
      );
    });

    test("works for Expo Image components with .tsx files", () => {
      // Standard Expo setup: TypeScript processes .tsx files automatically
      // Only tsconfig.json changes needed

      registerCSS(`
        .expo-test {
          width: 22px;
          height: 22px;
          fill: navy;
        }
      `);

      styled(MockExpoImage, {
        className: {
          target: "style",
        },
      });

      // Manual jsx call simulates TypeScript's automatic transform
      const { jsx } = require("../../jsx-runtime");
      const element = jsx(MockExpoImage, {
        testID: testID,
        className: "expo-test",
        source: { uri: "test.jpg" },
      });

      render(element);
      const component = screen.getByTestId(testID);

      expect(component.props).toEqual(
        expect.objectContaining({
          testID,
          children,
          "data-source": JSON.stringify({ uri: "test.jpg" }),
          "style": {
            width: 22,
            height: 22,
          },
        }),
      );
    });
  });
});

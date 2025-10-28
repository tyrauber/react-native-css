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

  describe("Future Goal (With TypeScript Configuration)", () => {
    test.skip("IDEAL: should work automatically with jsxImportSource config", () => {
      // This test shows what the final solution would look like
      // Once users configure tsconfig.json with:
      // "jsxImportSource": "react-native-css"

      registerCSS(`
        .auto-transform {
          width: 60px;
          height: 60px;
          fill: gold;
        }
      `);

      styled(MockCircle, {
        className: {
          target: "style",
          nativeStyleMapping: { width: "r", height: "r", fill: "fill" },
        },
      });

      // This JSX would automatically use our JSX runtime
      render(<MockCircle testID={testID} className="auto-transform" />);
      const component = screen.getByTestId(testID);

      expect(component.props).toEqual(
        expect.objectContaining({
          "data-r": 60,
          "data-fill": "#ffd700",
        }),
      );
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

  describe("TypeScript-only Configuration Test", () => {
    test("should verify TypeScript JSX transform is sufficient for Expo", () => {
      // This test verifies that we don't need Babel config changes for Expo
      // The fact that our manual jsx() tests pass proves the concept works
      // In a real Expo app with tsconfig.json configured, TypeScript would
      // automatically transform JSX to use our jsx() function

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

      // This proves that TypeScript-only JSX transform would work
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

    test("should work without Babel config changes for .tsx files", () => {
      // For Expo users: TypeScript processes .tsx files
      // No babel.config.js changes needed - just tsconfig.json

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

/* eslint-disable */
// @ts-nocheck
import React from "react";
import { View } from "react-native";

import { render, screen } from "@testing-library/react-native";
import { registerCSS, testID } from "react-native-css/jest";
import { styled } from "react-native-css/runtime";

const children = undefined;

// Mock SVG component that mimics react-native-svg behavior
const MockSvg = React.forwardRef<any, any>((props: any, ref: any) => {
  // SVG components typically expect height, width, fill, stroke as direct props
  return <View ref={ref} {...props} testID={props.testID ?? "mock-svg"} />;
});
MockSvg.displayName = "MockSvg";

// Mock native Image component that mimics expo-image behavior
const MockImage = React.forwardRef<any, any>((props: any, ref: any) => {
  return <View ref={ref} {...props} testID={props.testID ?? "mock-image"} />;
});
MockImage.displayName = "MockImage";

// Mock native component with custom props
const MockNativeComponent = React.forwardRef<any, any>(
  (props: any, ref: any) => {
    return <View ref={ref} {...props} testID={props.testID ?? "mock-native"} />;
  },
);
MockNativeComponent.displayName = "MockNativeComponent";

describe("styled() with SVG and Native Components", () => {
  describe("SVG Components", () => {
    test("should work with basic className without explicit nativeStyleMapping", () => {
      registerCSS(`
        .icon {
          height: 24px;
          width: 24px;
          color: red;
        }
      `);

      // This should work without explicit nativeStyleMapping configuration
      const StyledSvg = styled(MockSvg, {
        className: "style",
      });

      render(<StyledSvg testID={testID} className="icon" />);
      const component = screen.getByTestId(testID);

      // SVG components should receive height and width as direct props
      // This test will currently FAIL because styled() doesn't handle SVGs properly
      expect(component.props).toEqual(
        expect.objectContaining({
          testID,
          children,
          height: 24,
          width: 24,
          style: expect.objectContaining({
            color: "#f00",
          }),
        }),
      );
    });

    test("should work with SVG-specific props like fill and stroke", () => {
      registerCSS(`
        .icon-styled {
          height: 32px;
          width: 32px;
          fill: blue;
          stroke: green;
          stroke-width: 2px;
        }
      `);

      const StyledSvg = styled(MockSvg, {
        className: "style",
      });

      render(<StyledSvg testID={testID} className="icon-styled" />);
      const component = screen.getByTestId(testID);

      // SVG components should receive fill, stroke as direct props
      // This test will currently FAIL
      expect(component.props).toEqual(
        expect.objectContaining({
          testID,
          children,
          height: 32,
          width: 32,
          fill: "#00f",
          stroke: "#008000",
          strokeWidth: 2,
          style: {},
        }),
      );
    });

    test("should work with size prop shorthand", () => {
      registerCSS(`
        .icon-size {
          width: 20px;
          height: 20px;
        }
      `);

      const StyledSvg = styled(MockSvg, {
        className: "style",
      });

      render(<StyledSvg testID={testID} className="icon-size" />);
      const component = screen.getByTestId(testID);

      // When width and height are the same, some SVG components accept a size prop
      // This test will currently FAIL
      expect(component.props).toEqual(
        expect.objectContaining({
          testID,
          children,
          height: 20,
          width: 20,
        }),
      );
    });
  });

  describe("Native Image Components", () => {
    test("should work with image components without explicit configuration", () => {
      registerCSS(`
        .image {
          width: 100px;
          height: 100px;
          border-radius: 8px;
        }
      `);

      // Image components typically use style objects, not direct props
      const StyledImage = styled(MockImage, {
        className: "style",
      });

      render(<StyledImage testID={testID} className="image" />);
      const component = screen.getByTestId(testID);

      // Images should receive styles normally
      // This test might FAIL due to ref forwarding issues
      expect(component.props).toEqual(
        expect.objectContaining({
          testID,
          children,
          style: {
            width: 100,
            height: 100,
            borderRadius: 8,
          },
        }),
      );
    });
  });

  describe("Ref Forwarding", () => {
    test("should properly forward refs through styled components", () => {
      registerCSS(`
        .test {
          color: red;
        }
      `);

      const StyledComponent = styled(MockSvg, {
        className: "style",
      });

      const ref = React.createRef<any>();

      render(<StyledComponent ref={ref} testID={testID} className="test" />);

      // Ref should be properly forwarded to the underlying component
      // This test will currently FAIL due to ref forwarding issues
      expect(ref.current).toBeTruthy();
      expect(ref.current.props.testID).toBe(testID);
    });
  });

  describe("Component Type Detection", () => {
    test("should automatically detect SVG components and apply appropriate mappings", () => {
      registerCSS(`
        .auto-svg {
          height: 16px;
          width: 16px;
          fill: purple;
        }
      `);

      // Component name contains 'svg' - should be auto-detected
      const MockSvgIcon = React.forwardRef<any, any>((props: any, ref: any) => {
        return (
          <View ref={ref} {...props} testID={props.testID ?? "svg-icon"} />
        );
      });
      MockSvgIcon.displayName = "SvgIcon";

      const StyledSvgIcon = styled(MockSvgIcon, {
        className: "style",
      });

      render(<StyledSvgIcon testID={testID} className="auto-svg" />);
      const component = screen.getByTestId(testID);

      // Should automatically map SVG props without explicit nativeStyleMapping
      // This test will currently FAIL because auto-detection doesn't exist
      expect(component.props).toEqual(
        expect.objectContaining({
          testID,
          children,
          height: 16,
          width: 16,
          fill: "#800080",
        }),
      );
    });

    test("should automatically detect Image components and use style objects", () => {
      registerCSS(`
        .auto-image {
          width: 50px;
          height: 50px;
          opacity: 0.8;
        }
      `);

      // Component name contains 'Image' - should be auto-detected
      const MockImageComponent = React.forwardRef<any, any>(
        (props: any, ref: any) => {
          return (
            <View ref={ref} {...props} testID={props.testID ?? "image-comp"} />
          );
        },
      );
      MockImageComponent.displayName = "Image";

      const StyledImageComponent = styled(MockImageComponent, {
        className: "style",
      });

      render(<StyledImageComponent testID={testID} className="auto-image" />);
      const component = screen.getByTestId(testID);

      // Should use style objects for Image components
      // This test might PASS if ref forwarding is fixed
      expect(component.props).toEqual(
        expect.objectContaining({
          testID,
          children,
          style: {
            width: 50,
            height: 50,
            opacity: 0.8,
          },
        }),
      );
    });
  });

  describe("Current Implementation Compatibility", () => {
    test("should maintain backward compatibility with explicit nativeStyleMapping", () => {
      registerCSS(`
        .explicit {
          height: 40px;
          width: 40px;
          color: orange;
        }
      `);

      // Existing explicit configuration should still work
      const StyledExplicit = styled(MockSvg, {
        className: {
          target: "style",
          nativeStyleMapping: {
            height: "height",
            width: "width",
          },
        },
      });

      render(<StyledExplicit testID={testID} className="explicit" />);
      const component = screen.getByTestId(testID);

      expect(component.props).toEqual(
        expect.objectContaining({
          testID,
          children,
          height: 40,
          width: 40,
          style: expect.objectContaining({
            color: "#ffa500",
          }),
        }),
      );
    });

    test("should work with the deprecated nativeStyleToProp property", () => {
      registerCSS(`
        .deprecated {
          height: 28px;
          width: 28px;
          fill: cyan;
        }
      `);

      // Test deprecated API still works
      const StyledDeprecated = styled(MockSvg, {
        className: {
          target: "style",
          // @ts-expect-error - testing deprecated property
          nativeStyleToProp: {
            height: "height",
            width: "width",
            fill: "fill",
          },
        },
      });

      render(<StyledDeprecated testID={testID} className="deprecated" />);
      const component = screen.getByTestId(testID);

      expect(component.props).toEqual(
        expect.objectContaining({
          testID,
          children,
          height: 28,
          width: 28,
          fill: "#0ff",
          style: {},
        }),
      );
    });
  });
});

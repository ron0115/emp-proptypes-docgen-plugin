// import * as React from "react";

// interface DefaultPropValueComponentProps {
//   /**
//    * Button color.
//    *
//    * @default blue
//    **/
//   color: "blue" | "green";

//   /**
//    * Button counter.
//    */
//   counter?: number;

//   /**
//    * Button disabled.
//    */
//   disabled?: boolean;
// }

// /**
//  * Component with a prop with a default value.
//  */
// export const DefaultPropValueComponent: React.FC<DefaultPropValueComponentProps> = (
//   props
// ) => (
//   <button disabled={props.disabled} style={{ backgroundColor: props.color }}>
//     {props.counter}
//     {props.children}
//   </button>
// );

// DefaultPropValueComponent.defaultProps = {
//   counter: 123,
//   disabled: false,
// };
import { genStyles } from "@/utils";
import React, {
  CSSProperties,
  HTMLAttributes,
  useEffect,
  useState,
} from "react";
import defaultStyles from "./index.module.scss";
export type CircleProgressType = {
  r: number;
  percent?: number;
  strokeWidth?: number;
  borderOffset?: number;
  visible?: boolean;
  edgeSlot?: React.ReactNode;
  centerSlot?: React.ReactNode;
  edgeStyle?: React.HTMLAttributes<HTMLDivElement>["style"];
  centerStyle?: React.HTMLAttributes<HTMLDivElement>["style"];
  /**
   *  @empPropType Upload
   *  @default https://www.baidu.com
   *  @desc 图标地址
   */
  iconUrl: string;
  /**
   *  @empPropType StyleEdit
   */
  style?: CSSProperties;
};

const styles = genStyles("ge-circle-progress", defaultStyles);
/** 环形进度条 */
export const CircleProgress = ({
  r,
  percent = 0,
  strokeWidth = 8,
  borderOffset = 4,
  visible = true,
  edgeSlot,
  centerSlot,
  centerStyle,
  edgeStyle: edgeStyleProps,
  ...otherProps
}: CircleProgressType) => {
  const [edgeStyle, setEdgeStyle] = useState({
    transform: "",
  });

  const size = {
    width: 2 * r + 2 * strokeWidth + 2 * borderOffset,
    height: 2 * r + 2 * strokeWidth + 2 * borderOffset,
  };

  // 定位edge的位置
  const perimeter = 2 * r * Math.PI;
  const strokeDashoffset = perimeter * (1 - percent);
  const offsetR = r + strokeWidth + borderOffset;
  const circleStyle = {
    strokeWidth: strokeWidth + "px",
  };
  const circleProps = {
    r: r,
    cx: offsetR,
    cy: offsetR,
  };
  // centerXAxis
  const a = offsetR;
  // centerYAxis
  const b = offsetR;

  // const edgeY = b - offsetR * Math.sqrt(1 - Math.sin(360 * percent) ** 2)
  // const edgeX = a + offsetR * Math.sin(360 * percent)
  // 逆时针，所以x用gsin，y用cos
  const edgeX = a + offsetR * Math.sin((360 * percent * Math.PI) / 180);
  const edgeY = b - offsetR * Math.cos((360 * percent * Math.PI) / 180);

  // 修正edge的位置
  useEffect(() => {
    let transform = "";
    if (percent > 0.5 && percent <= 1) {
      transform += `translateX(-100%)`;
    }

    if ((percent >= 0 && percent < 0.25) || (percent > 0.75 && percent <= 1)) {
      transform += `translateY(-100%)`;
    }
    setEdgeStyle({
      transform,
    });
  }, [percent]);

  // if (p)
  return (
    <div
      className={styles.container}
      {...otherProps}
      style={{
        width: size.width + "px",
        height: size.height + "px",
        display: visible ? "block" : "none",
        // ...otherProps.style,
      }}
    >
      <svg
        className={styles.svg}
        {...size}
        // viewPort="0 0 100 100"
        // version="1.1"
        // xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          className={styles.circle}
          {...circleProps}
          fill="transparent"
          strokeDasharray={2 * r * Math.PI}
          strokeDashoffset="0"
          style={circleStyle}
        />
        <circle
          className={styles.bar}
          style={circleStyle}
          {...circleProps}
          // 中间是透明
          fill="transparent"
          strokeDasharray={2 * r * Math.PI}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90, ${offsetR}, ${offsetR})`}
        />
      </svg>
      <div className={styles.centerSlot} style={centerStyle}>
        {centerSlot}
      </div>
      <div
        // ref={edgeRef}
        className={styles.edge}
        style={{
          position: "absolute",
          left: edgeX + "px",
          top: edgeY + "px",
          ...edgeStyle,
          ...edgeStyleProps,
        }}
      >
        {edgeSlot}
      </div>
    </div>
  );
};
export default CircleProgress;

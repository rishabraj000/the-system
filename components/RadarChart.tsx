import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Polygon, Circle, Line, Text as SvgText, G } from "react-native-svg";
import Colors from "@/constants/colors";

interface RadarChartProps {
  labels: string[];
  values: number[];
  maxValue?: number;
  size?: number;
  color?: string;
  fillColor?: string;
}

export function CustomRadarChart({
  labels,
  values,
  maxValue = 999,
  size = 240,
  color = Colors.dark.accent,
  fillColor = `rgba(0,212,255,0.15)`,
}: RadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.38;
  const n = labels.length;
  const levels = 4;

  const angleOf = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;

  const getPoint = (angle: number, r: number) => ({
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  });

  // Web grid rings
  const gridRings = Array.from({ length: levels }, (_, i) => {
    const r = (radius * (i + 1)) / levels;
    const pts = labels
      .map((_, idx) => {
        const p = getPoint(angleOf(idx), r);
        return `${p.x},${p.y}`;
      })
      .join(" ");
    return pts;
  });

  // Data polygon
  const normalizedValues = values.map((v) => Math.min(v / maxValue, 1));
  const dataPoints = normalizedValues.map((v, i) => {
    const p = getPoint(angleOf(i), v * radius);
    return `${p.x},${p.y}`;
  });

  // Label positions (pushed outward)
  const labelRadius = radius + 26;

  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={size} height={size}>
        {/* Grid rings */}
        {gridRings.map((pts, i) => (
          <Polygon
            key={`ring-${i}`}
            points={pts}
            fill="none"
            stroke={Colors.dark.border}
            strokeWidth={1}
          />
        ))}

        {/* Axis lines */}
        {labels.map((_, i) => {
          const outer = getPoint(angleOf(i), radius);
          return (
            <Line
              key={`axis-${i}`}
              x1={cx}
              y1={cy}
              x2={outer.x}
              y2={outer.y}
              stroke={Colors.dark.borderLight}
              strokeWidth={1}
            />
          );
        })}

        {/* Data polygon fill */}
        <Polygon
          points={dataPoints.join(" ")}
          fill={fillColor}
          stroke={color}
          strokeWidth={2}
        />

        {/* Data points */}
        {normalizedValues.map((v, i) => {
          const p = getPoint(angleOf(i), v * radius);
          return (
            <Circle key={`dot-${i}`} cx={p.x} cy={p.y} r={4} fill={color} />
          );
        })}

        {/* Labels */}
        {labels.map((label, i) => {
          const angle = angleOf(i);
          const p = getPoint(angle, labelRadius);
          const textAnchor =
            Math.abs(angle) < 0.1 || Math.abs(angle - Math.PI) < 0.1
              ? "middle"
              : angle > 0 && angle < Math.PI
              ? "middle"
              : "middle";
          return (
            <SvgText
              key={`label-${i}`}
              x={p.x}
              y={p.y + 4}
              textAnchor="middle"
              fontSize={10}
              fontWeight="700"
              fill={Colors.dark.textSecondary}
            >
              {label}
            </SvgText>
          );
        })}

        {/* Value labels on data points */}
        {normalizedValues.map((v, i) => {
          const p = getPoint(angleOf(i), v * radius);
          return (
            <SvgText
              key={`val-${i}`}
              x={p.x}
              y={p.y - 8}
              textAnchor="middle"
              fontSize={9}
              fontWeight="700"
              fill={color}
            >
              {values[i]}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}

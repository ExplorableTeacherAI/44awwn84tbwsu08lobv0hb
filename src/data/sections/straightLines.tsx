import React, { useRef, useState, type ReactElement } from "react";
import { Block } from "@/components/templates";
import { SplitLayout, StackLayout } from "@/components/layouts";
import {
    EditableH2,
    EditableParagraph,
    InlineClozeChoice,
    InlineClozeInput,
    InlineFeedback,
    InlineLinkedHighlight,
    InlineScrubbleNumber,
    InteractionHintSequence,
} from "@/components/atoms";
import { Figure, FigureSlider, FormulaBlock } from "@/components/molecules";
import { useVar, useSetVar } from "@/stores";
import { clamp, useSpring, type Vec2 } from "@/lib/motion";
import {
    choicePropsFromDefinition,
    clozePropsFromDefinition,
    getVariableInfo,
    linkedHighlightPropsFromDefinition,
    numberPropsFromDefinition,
} from "../variables";

// ── View geometry ────────────────────────────────────────────────────────────
// Both views share the same viewBox, the same readout strip and the same accent
// hue; the marked point at x is drawn in the grid and worked out in the
// equation, so the two are literally the same number seen twice.

const VIEW_WIDTH = 360;
const VIEW_HEIGHT = 340;
const UNIT_PX = 25;
const ORIGIN_X = 56;
const ORIGIN_Y = 252;
const GRID_MAX_X = 9;
const GRID_MIN_Y = -3;
const GRID_MAX_Y = 8;
const TILT_HANDLE_X = 2;

const INK = "#334155";
const INK_STRUCTURE = "#64748B";
const INK_QUIET = "#CBD5E1";
const ACCENT = "#62D0AD";

const EASE_150 = { transition: "opacity 150ms ease, stroke-width 150ms ease" } as const;
const NUMERALS = { fontVariantNumeric: "tabular-nums" } as const;

const toPixelX = (x: number) => ORIGIN_X + x * UNIT_PX;
const toPixelY = (y: number) => ORIGIN_Y - y * UNIT_PX;

/** One formatter per quantity, used by both views and by the prose. */
const formatNumber = (value: number) => {
    const size = Math.abs(value);
    return `${value < 0 ? "−" : ""}${Number.isInteger(size) ? size : size.toFixed(1)}`;
};

const useLineModel = () => {
    const gradient = useVar<number>("lineGradient", 2);
    const intercept = useVar<number>("lineIntercept", 1);
    const probeX = useVar<number>("lineProbeX", 4);
    return { gradient, intercept, probeX, probeY: gradient * probeX + intercept };
};

// ── Shared highlight channel across both views ───────────────────────────────

const useLineHighlight = () => {
    const highlight = useVar<string>("lineHighlight", "");
    const setVar = useSetVar();
    const active = (id: string) => highlight === id;
    return {
        isActive: active,
        opacity: (id: string) => (highlight && !active(id) ? 0.35 : 1),
        weight: (id: string, resting: number) => (active(id) ? resting * 1.6 : resting),
        hoverProps: (id: string) => ({
            onPointerEnter: () => setVar("lineHighlight", id),
            onPointerLeave: () => setVar("lineHighlight", ""),
        }),
    };
};

const Halo = ({ active, children }: { active: boolean; children: React.ReactNode }) =>
    active ? <g opacity={0.28}>{children}</g> : null;

const svgPointFromEvent = (event: React.PointerEvent, svg: SVGSVGElement | null): Vec2 => {
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
        x: ((event.clientX - rect.left) / rect.width) * VIEW_WIDTH,
        y: ((event.clientY - rect.top) / rect.height) * VIEW_HEIGHT,
    };
};

// ── Shared readout strip — the same two numbers head both views ──────────────

function SharedReadouts() {
    const { gradient, intercept } = useLineModel();
    const { opacity } = useLineHighlight();
    return (
        <g fontSize="12" style={{ ...NUMERALS, ...EASE_150 }}>
            <text x="24" y="26" fill={INK} opacity={opacity("gradient")}>
                {`gradient m = ${formatNumber(gradient)}`}
            </text>
            <text x={VIEW_WIDTH - 24} y="26" fill={INK} textAnchor="end" opacity={opacity("intercept")}>
                {`crossing c = ${formatNumber(intercept)}`}
            </text>
        </g>
    );
}

// ── VIEW A: the line on the grid, with its staircase of one-right steps ──────

function VerticalHandle({
    x,
    y,
    onDragTo,
    svgRef,
}: {
    x: number;
    y: number;
    onDragTo: (value: number) => void;
    svgRef: React.RefObject<SVGSVGElement>;
}) {
    const [dragging, setDragging] = useState(false);
    const [hovered, setHovered] = useState(false);
    const draggingRef = useRef(false);
    const scale = useSpring(dragging || hovered ? 1.2 : 1, { stiffness: 400, damping: 26 });

    const handlePointerMove = (event: React.PointerEvent<SVGCircleElement>) => {
        if (!draggingRef.current) return;
        const point = svgPointFromEvent(event, svgRef.current);
        onDragTo((ORIGIN_Y - point.y) / UNIT_PX);
    };

    const cx = toPixelX(x);
    const cy = toPixelY(y);

    return (
        <g>
            <g transform={`translate(${cx} ${cy}) scale(${scale})`}>
                <circle r="8" fill={ACCENT} filter="url(#line-handle-shadow)" />
            </g>
            <circle
                cx={cx}
                cy={cy}
                r="22"
                fill="transparent"
                style={{ cursor: dragging ? "grabbing" : "grab", touchAction: "none" }}
                onPointerDown={(event) => {
                    event.currentTarget.setPointerCapture(event.pointerId);
                    draggingRef.current = true;
                    setDragging(true);
                }}
                onPointerMove={handlePointerMove}
                onPointerUp={() => {
                    draggingRef.current = false;
                    setDragging(false);
                }}
                onPointerCancel={() => {
                    draggingRef.current = false;
                    setDragging(false);
                }}
                onPointerEnter={() => setHovered(true)}
                onPointerLeave={() => setHovered(false)}
            />
        </g>
    );
}

function LineGridDrawing() {
    const svgRef = useRef<SVGSVGElement>(null);
    const setVar = useSetVar();
    const { gradient, intercept, probeX, probeY } = useLineModel();
    const { opacity, weight, isActive, hoverProps } = useLineHighlight();

    const heightAt = (x: number) => gradient * x + intercept;
    const inGrid = (y: number) => y >= GRID_MIN_Y && y <= GRID_MAX_Y;

    const steps = Array.from({ length: GRID_MAX_X }, (_, i) => i).filter(
        (i) => inGrid(heightAt(i)) && inGrid(heightAt(i + 1)),
    );

    const probeInGrid = inGrid(probeY);

    return (
        <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            className="block w-full select-none"
            role="img"
            aria-label="A straight line on a grid with a staircase of one-right steps, a tilt handle and a handle on the y-axis"
        >
            <defs>
                <filter id="line-handle-shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#0F172A" floodOpacity="0.25" />
                </filter>
                <clipPath id="line-grid-clip">
                    <rect
                        x={toPixelX(0)}
                        y={toPixelY(GRID_MAX_Y)}
                        width={GRID_MAX_X * UNIT_PX}
                        height={(GRID_MAX_Y - GRID_MIN_Y) * UNIT_PX}
                    />
                </clipPath>
            </defs>

            <SharedReadouts />

            {/* Grid and axes — ambient structure, always quiet. */}
            <g opacity={opacity("__structure")} style={EASE_150}>
                {Array.from({ length: GRID_MAX_X + 1 }, (_, i) => (
                    <line key={`grid-x-${i}`} x1={toPixelX(i)} y1={toPixelY(GRID_MIN_Y)} x2={toPixelX(i)} y2={toPixelY(GRID_MAX_Y)} stroke={INK_QUIET} strokeWidth="1" />
                ))}
                {Array.from({ length: GRID_MAX_Y - GRID_MIN_Y + 1 }, (_, i) => GRID_MIN_Y + i).map((value) => (
                    <line key={`grid-y-${value}`} x1={toPixelX(0)} y1={toPixelY(value)} x2={toPixelX(GRID_MAX_X)} y2={toPixelY(value)} stroke={INK_QUIET} strokeWidth="1" />
                ))}
                <line x1={toPixelX(0)} y1={toPixelY(0)} x2={toPixelX(GRID_MAX_X)} y2={toPixelY(0)} stroke={INK_STRUCTURE} strokeWidth="1.5" />
                <line x1={toPixelX(0)} y1={toPixelY(GRID_MIN_Y)} x2={toPixelX(0)} y2={toPixelY(GRID_MAX_Y)} stroke={INK_STRUCTURE} strokeWidth="1.5" />
                <g fill={INK} fontSize="11" style={NUMERALS}>
                    {[0, 3, 6, 9].map((i) => (
                        <text key={`label-x-${i}`} x={toPixelX(i)} y={toPixelY(0) + 16} textAnchor="middle">{i}</text>
                    ))}
                    {[-2, 2, 4, 6, 8].map((i) => (
                        <text key={`label-y-${i}`} x={ORIGIN_X - 10} y={toPixelY(i) + 4} textAnchor="end">
                            {formatNumber(i)}
                        </text>
                    ))}
                </g>
            </g>

            <g clipPath="url(#line-grid-clip)">
                {/* GRADIENT — the staircase, counterpart of the number in front of x. */}
                <g {...hoverProps("gradient")} opacity={opacity("gradient")} style={EASE_150}>
                    {steps.map((i) => (
                        <g key={`step-${i}`}>
                            <Halo active={isActive("gradient")}>
                                <path
                                    d={`M ${toPixelX(i)} ${toPixelY(heightAt(i))} L ${toPixelX(i + 1)} ${toPixelY(heightAt(i))} L ${toPixelX(i + 1)} ${toPixelY(heightAt(i + 1))}`}
                                    fill="none"
                                    stroke={INK_STRUCTURE}
                                    strokeWidth={weight("gradient", 2) + 6}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </Halo>
                            <path
                                d={`M ${toPixelX(i)} ${toPixelY(heightAt(i))} L ${toPixelX(i + 1)} ${toPixelY(heightAt(i))} L ${toPixelX(i + 1)} ${toPixelY(heightAt(i + 1))}`}
                                fill="none"
                                stroke={INK_STRUCTURE}
                                strokeWidth={weight("gradient", 2)}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </g>
                    ))}
                </g>

                {/* The line itself. */}
                <line
                    x1={toPixelX(0)}
                    y1={toPixelY(heightAt(0))}
                    x2={toPixelX(GRID_MAX_X)}
                    y2={toPixelY(heightAt(GRID_MAX_X))}
                    stroke={ACCENT}
                    strokeWidth="3"
                    strokeLinecap="round"
                    opacity={opacity("__structure")}
                    style={EASE_150}
                />

                {/* PROBE — the point the equation is working out, marked here. */}
                {probeInGrid && (
                    <g {...hoverProps("probe")} opacity={opacity("probe")} style={EASE_150}>
                        <line x1={toPixelX(0)} y1={toPixelY(probeY)} x2={toPixelX(probeX)} y2={toPixelY(probeY)} stroke={ACCENT} strokeWidth="1.5" strokeDasharray="3 4" opacity={0.7} />
                        <line x1={toPixelX(probeX)} y1={toPixelY(0)} x2={toPixelX(probeX)} y2={toPixelY(probeY)} stroke={ACCENT} strokeWidth="1.5" strokeDasharray="3 4" opacity={0.7} />
                        <Halo active={isActive("probe")}>
                            <circle cx={toPixelX(probeX)} cy={toPixelY(probeY)} r="7" fill="none" stroke={ACCENT} strokeWidth="12" />
                        </Halo>
                        <circle cx={toPixelX(probeX)} cy={toPixelY(probeY)} r={isActive("probe") ? 9 : 7} fill={ACCENT} style={EASE_150} />
                    </g>
                )}
            </g>

            {/* INTERCEPT — the crossing point, counterpart of the last number. */}
            <g {...hoverProps("intercept")} opacity={opacity("intercept")} style={EASE_150}>
                <Halo active={isActive("intercept")}>
                    <circle cx={toPixelX(0)} cy={toPixelY(intercept)} r="8" fill="none" stroke={ACCENT} strokeWidth="12" />
                </Halo>
                <VerticalHandle
                    x={0}
                    y={intercept}
                    svgRef={svgRef}
                    onDragTo={(value) => setVar("lineIntercept", clamp(Math.round(value), 0, 4))}
                />
            </g>

            {/* The tilt handle, riding the line two squares along. */}
            <g {...hoverProps("gradient")} opacity={opacity("gradient")} style={EASE_150}>
                <VerticalHandle
                    x={TILT_HANDLE_X}
                    y={heightAt(TILT_HANDLE_X)}
                    svgRef={svgRef}
                    onDragTo={(value) =>
                        setVar(
                            "lineGradient",
                            clamp(Math.round(((value - intercept) / TILT_HANDLE_X) * 2) / 2, -1.5, 2),
                        )
                    }
                />
            </g>
        </svg>
    );
}

// ── VIEW B: the same line as an equation, with draggable numbers ─────────────

const EQUATION_Y = 148;
const EQUATION_FONT = 24;
const EQUATION_CHAR = EQUATION_FONT * 0.6;

function DraggableEquationNumber({
    varName,
    value,
    x,
    highlightId,
    min,
    max,
    step,
}: {
    varName: string;
    value: number;
    x: number;
    highlightId: string;
    min: number;
    max: number;
    step: number;
}) {
    const setVar = useSetVar();
    const { opacity, weight, isActive, hoverProps } = useLineHighlight();
    const [dragging, setDragging] = useState(false);
    // A ref, not state: a fast drag can deliver its first pointermove before a
    // state update has flushed, and the stale closure would swallow it.
    const draggingRef = useRef(false);
    const startRef = useRef({ clientX: 0, value: 0 });

    const label = formatNumber(value);
    const width = label.length * EQUATION_CHAR;

    return (
        <g {...hoverProps(highlightId)} opacity={opacity(highlightId)} style={EASE_150}>
            <text
                x={x}
                y={EQUATION_Y}
                fill={ACCENT}
                fontSize={isActive(highlightId) ? EQUATION_FONT + 2 : EQUATION_FONT}
                fontWeight={600}
                style={{ ...NUMERALS, ...EASE_150 }}
            >
                {label}
            </text>
            <line
                x1={x}
                y1={EQUATION_Y + 7}
                x2={x + width}
                y2={EQUATION_Y + 7}
                stroke={ACCENT}
                strokeWidth={weight(highlightId, 1.5)}
                strokeDasharray="3 3"
                opacity={0.8}
            />
            <rect
                x={x - 6}
                y={EQUATION_Y - 24}
                width={width + 12}
                height="34"
                fill="transparent"
                style={{ cursor: dragging ? "grabbing" : "ew-resize", touchAction: "none" }}
                onPointerDown={(event) => {
                    event.currentTarget.setPointerCapture(event.pointerId);
                    startRef.current = { clientX: event.clientX, value };
                    draggingRef.current = true;
                    setDragging(true);
                }}
                onPointerMove={(event) => {
                    if (!draggingRef.current) return;
                    const moved = Math.round((event.clientX - startRef.current.clientX) / 22) * step;
                    setVar(varName, clamp(startRef.current.value + moved, min, max));
                }}
                onPointerUp={() => {
                    draggingRef.current = false;
                    setDragging(false);
                }}
                onPointerCancel={() => {
                    draggingRef.current = false;
                    setDragging(false);
                }}
            />
        </g>
    );
}

function LineEquationDrawing() {
    const { gradient, intercept, probeX, probeY } = useLineModel();
    const { opacity, isActive, hoverProps } = useLineHighlight();

    const gradientLabel = formatNumber(gradient);
    const gradientX = 28 + 4 * EQUATION_CHAR;
    const middleX = gradientX + gradientLabel.length * EQUATION_CHAR;
    const interceptX = middleX + 4 * EQUATION_CHAR;

    return (
        <svg
            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            className="block w-full select-none"
            role="img"
            aria-label="The equation of the line with draggable numbers for the gradient and the y-axis crossing"
        >
            <SharedReadouts />

            <g opacity={opacity("__structure")} style={EASE_150}>
                <text x="28" y="86" fill={INK_STRUCTURE} fontSize="16">
                    y = m x + c
                </text>
            </g>

            {/* The live equation. Both numbers are draggable from here. */}
            <text x="28" y={EQUATION_Y} fill={INK} fontSize={EQUATION_FONT} style={NUMERALS} opacity={opacity("__structure")}>
                y =
            </text>
            <DraggableEquationNumber
                varName="lineGradient"
                value={gradient}
                x={gradientX}
                highlightId="gradient"
                min={-1.5}
                max={2}
                step={0.5}
            />
            <text x={middleX} y={EQUATION_Y} fill={INK} fontSize={EQUATION_FONT} style={NUMERALS} opacity={opacity("__structure")}>
                x +
            </text>
            <DraggableEquationNumber
                varName="lineIntercept"
                value={intercept}
                x={interceptX}
                highlightId="intercept"
                min={0}
                max={4}
                step={1}
            />

            <g {...hoverProps("gradient")} opacity={opacity("gradient")} style={EASE_150}>
                <rect x="20" y="182" width="300" height="24" fill="transparent" />
                <text x="28" y="200" fill={INK} fontSize="12" style={NUMERALS}>
                    {`one step right, ${formatNumber(Math.abs(gradient))} ${gradient < 0 ? "down" : "up"}`}
                </text>
            </g>

            <g {...hoverProps("intercept")} opacity={opacity("intercept")} style={EASE_150}>
                <rect x="20" y="210" width="300" height="24" fill="transparent" />
                <text x="28" y="228" fill={INK} fontSize="12" style={NUMERALS}>
                    {`crosses the y-axis at ${formatNumber(intercept)}`}
                </text>
            </g>

            {/* PROBE — the substitution, marked on the grid as a teal point. */}
            <g {...hoverProps("probe")} opacity={opacity("probe")} style={EASE_150}>
                <rect x="20" y="256" width="310" height="34" fill="transparent" />
                <text
                    x="28"
                    y="280"
                    fill={ACCENT}
                    fontSize={isActive("probe") ? "16" : "15"}
                    style={{ ...NUMERALS, ...EASE_150 }}
                >
                    {`x = ${probeX} → y = ${gradientLabel} × ${probeX} + ${formatNumber(intercept)} = ${formatNumber(probeY)}`}
                </text>
            </g>
        </svg>
    );
}

// ── Figure shells ────────────────────────────────────────────────────────────

const resetLine = (setVar: (name: string, value: number | string) => void) => {
    setVar("lineGradient", 2);
    setVar("lineIntercept", 1);
    setVar("lineProbeX", 4);
    setVar("lineHighlight", "");
};

function LineGridFigure() {
    const setVar = useSetVar();
    return (
        <Figure
            id="straight-line-grid"
            onReset={() => resetLine(setVar)}
            caption="Drag the upper teal handle to tilt the line, or the one sitting on the y-axis to slide it up and down. The staircase always takes one step right, then climbs by the gradient."
        >
            <LineGridDrawing />
            <InteractionHintSequence
                hintKey="straight-line-tilt-handle"
                steps={[
                    {
                        gesture: "drag-vertical",
                        label: "Drag this handle to tilt the line",
                        position: { x: "29%", y: "33%" },
                        dragPath: { type: "line", startOffset: { x: 0, y: -22 }, endOffset: { x: 0, y: 22 } },
                    },
                ]}
            />
        </Figure>
    );
}

function LineEquationFigure() {
    const setVar = useSetVar();
    return (
        <Figure
            id="straight-line-equation"
            onReset={() => resetLine(setVar)}
            caption="The same line written as an equation. Drag either underlined number sideways and the line beside it answers, or slide x to work out the height at any step along."
        >
            <LineEquationDrawing />
            <div className="px-6 pb-5">
                <FigureSlider
                    varName="lineProbeX"
                    label="x value"
                    {...numberPropsFromDefinition(getVariableInfo("lineProbeX"))}
                    formatValue={(value) => `${value}`}
                />
            </div>
            <InteractionHintSequence
                hintKey="straight-line-drag-number"
                steps={[
                    {
                        gesture: "drag-horizontal",
                        label: "Drag the number in front of x",
                        position: { x: "25%", y: "32%" },
                        dragPath: { type: "line", startOffset: { x: -24, y: 0 }, endOffset: { x: 24, y: 0 } },
                    },
                ]}
            />
        </Figure>
    );
}

// ── Live numbers used inside the prose ───────────────────────────────────────

function LiveSubstitution() {
    const { gradient, intercept, probeX, probeY } = useLineModel();
    return (
        <span style={{ ...NUMERALS, color: ACCENT, fontWeight: 600 }}>
            {`${formatNumber(gradient)} × ${probeX} + ${formatNumber(intercept)} = ${formatNumber(probeY)}`}
        </span>
    );
}

export const straightLinesBlocks: ReactElement[] = [
    <StackLayout key="layout-part-straight-lines-heading" maxWidth="xl">
        <Block id="part-straight-lines-heading" padding="md">
            <EditableH2 id="h2-part-straight-lines-heading" blockId="part-straight-lines-heading">
                Part 2 · Straight Lines
            </EditableH2>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-straight-lines-setup" maxWidth="xl">
        <Block id="straight-lines-setup" padding="sm">
            <EditableParagraph id="para-straight-lines-setup" blockId="straight-lines-setup">
                A straight line never changes its mind. Take one step to the right and it climbs
                by the same amount every time, and that fixed climb is the{" "}
                <InlineLinkedHighlight
                    varName="lineHighlight"
                    highlightId="gradient"
                    {...linkedHighlightPropsFromDefinition(getVariableInfo("lineHighlight"))}
                >
                    gradient
                </InlineLinkedHighlight>
                , written m. Drag the upper teal handle to tilt the line, or drag either number in
                the equation beside it.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-straight-lines-formula" maxWidth="xl">
        <Block id="straight-lines-formula" padding="lg">
            <FormulaBlock
                latex="y = \highlight{gradient}{m}x + \highlight{intercept}{c}"
                linkedHighlights={{
                    gradient: { varName: "lineHighlight", color: ACCENT, bgColor: "rgba(98, 208, 173, 0.22)" },
                    intercept: { varName: "lineHighlight", color: ACCENT, bgColor: "rgba(98, 208, 173, 0.22)" },
                }}
            />
        </Block>
    </StackLayout>,

    // BOTH VIEWS VISIBLE AT ONCE — one source of truth, never tabs.
    <SplitLayout key="layout-straight-lines-pair" ratio="1:1" gap="lg" align="start">
        <Block id="straight-lines-grid-figure" padding="sm" hasVisualization>
            <LineGridFigure />
        </Block>
        <Block id="straight-lines-equation-figure" padding="sm" hasVisualization>
            <LineEquationFigure />
        </Block>
    </SplitLayout>,

    <StackLayout key="layout-straight-lines-worked-example" maxWidth="xl">
        <Block id="straight-lines-worked-example" padding="sm">
            <EditableParagraph id="para-straight-lines-worked-example" blockId="straight-lines-worked-example">
                The height where the line{" "}
                <InlineLinkedHighlight
                    varName="lineHighlight"
                    highlightId="intercept"
                    {...linkedHighlightPropsFromDefinition(getVariableInfo("lineHighlight"))}
                >
                    crosses the y-axis
                </InlineLinkedHighlight>{" "}
                is the second number, c. At x ={" "}
                <InlineScrubbleNumber
                    varName="lineProbeX"
                    {...numberPropsFromDefinition(getVariableInfo("lineProbeX"))}
                />{" "}
                the equation works out as <LiveSubstitution />, so that point sits on the line.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-straight-lines-question-height" maxWidth="xl">
        <Block id="straight-lines-question-height" padding="md">
            <EditableParagraph id="para-straight-lines-question-height" blockId="straight-lines-question-height">
                A different line has gradient 1.5 and crosses the y-axis at 4. Four steps along,
                at x = 4, its height is{" "}
                <InlineFeedback
                    varName="answerLineHeight"
                    correctValue="10"
                    position="terminal"
                    successMessage="— exactly, four steps at 1.5 each is a climb of 6, starting from 4, which lands on 10"
                    failureMessage="— not quite."
                    hint="multiply the gradient by 4 first, then add on the height it started from"
                    visualizationHint={{
                        blockId: "straight-lines-equation-figure",
                        hintKey: "straight-lines-question-height-hint",
                        label: "Discover it yourself",
                        resetVars: { lineGradient: 2, lineIntercept: 1, lineProbeX: 0 },
                        steps: [
                            {
                                gesture: "drag-horizontal",
                                label: "Drag the number in front of x down to 1.5",
                                position: { x: "25%", y: "32%" },
                                completionVar: "lineGradient",
                                completionValue: 1.5,
                                completionTolerance: 0.24,
                            },
                            {
                                gesture: "drag-horizontal",
                                label: "Now drag the last number up to 4",
                                position: { x: "47%", y: "32%" },
                                completionVar: "lineIntercept",
                                completionValue: 4,
                                completionTolerance: 0.4,
                            },
                            {
                                gesture: "drag-horizontal",
                                label: "Slide the x value along to 4 and read the line underneath",
                                position: { x: "50%", y: "84%" },
                                completionVar: "lineProbeX",
                                completionValue: 4,
                                completionTolerance: 0.4,
                            },
                        ],
                    }}
                >
                    <InlineClozeInput
                        varName="answerLineHeight"
                        correctAnswer="10"
                        {...clozePropsFromDefinition(getVariableInfo("answerLineHeight"))}
                    />
                </InlineFeedback>.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-straight-lines-question-shift" maxWidth="xl">
        <Block id="straight-lines-question-shift" padding="md">
            <EditableParagraph id="para-straight-lines-question-shift" blockId="straight-lines-question-shift">
                Sliding a line straight up the grid, without tilting it at all, changes{" "}
                <InlineFeedback
                    varName="answerLineShift"
                    correctValue="only c, the y-axis crossing"
                    position="terminal"
                    successMessage="— right, the steps keep the same climb, so only the starting height moves"
                    failureMessage="— have another look."
                    hint="a line that has not been tilted still climbs by the same amount for every step right"
                    visualizationHint={{
                        blockId: "straight-lines-grid-figure",
                        hintKey: "straight-lines-question-shift-hint",
                        label: "Discover it yourself",
                        resetVars: { lineGradient: 2, lineIntercept: 0, lineProbeX: 4 },
                        steps: [
                            {
                                gesture: "drag-vertical",
                                label: "Drag the handle on the y-axis up to 3 — watch which number changes",
                                position: { x: "16%", y: "66%" },
                                completionVar: "lineIntercept",
                                completionValue: 3,
                                completionTolerance: 0.4,
                            },
                        ],
                    }}
                >
                    <InlineClozeChoice
                        varName="answerLineShift"
                        correctAnswer="only c, the y-axis crossing"
                        options={[
                            "only c, the y-axis crossing",
                            "only m, the gradient",
                            "both m and c",
                        ]}
                        {...choicePropsFromDefinition(getVariableInfo("answerLineShift"))}
                    />
                </InlineFeedback>.
            </EditableParagraph>
        </Block>
    </StackLayout>,
];

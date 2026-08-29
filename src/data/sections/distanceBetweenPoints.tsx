import React, { useRef, useState, type ReactElement } from "react";
import { Block } from "@/components/templates";
import { SplitLayout, StackLayout } from "@/components/layouts";
import {
    EditableH2,
    EditableH3,
    EditableParagraph,
    InlineClozeInput,
    InlineFeedback,
    InlineLinkedHighlight,
    InlineScrubbleNumber,
    InlineSpotColor,
    InteractionHintSequence,
} from "@/components/atoms";
import { Figure, FigureSlider } from "@/components/molecules";
import { FormulaBlock } from "@/components/molecules";
import { useVar, useSetVar } from "@/stores";
import { clamp, useSpring, type Vec2 } from "@/lib/motion";
import {
    clozePropsFromDefinition,
    getVariableInfo,
    linkedHighlightPropsFromDefinition,
    numberPropsFromDefinition,
    spotColorPropsFromDefinition,
} from "../variables";

// ── Shared view geometry — the visible tie between the two views ─────────────
// Both drawings use the same viewBox and the same pixels-per-grid-square, so
// the teal bar in the working is literally as long as the sloping side.

const VIEW_WIDTH = 360;
const VIEW_HEIGHT = 320;
const UNIT_PX = 24;
const ORIGIN_X = 68;
const ORIGIN_Y = 286;
const GRID_MAX_X = 9;
const GRID_MAX_Y = 8;

const INK = "#334155";
const INK_STRUCTURE = "#64748B";
const INK_QUIET = "#CBD5E1";
const ACCENT = "#62D0AD";

const EASE_150 = { transition: "opacity 150ms ease, stroke-width 150ms ease" } as const;
const NUMERALS = { fontVariantNumeric: "tabular-nums" } as const;

const toPixelX = (x: number) => ORIGIN_X + x * UNIT_PX;
const toPixelY = (y: number) => ORIGIN_Y - y * UNIT_PX;

/** One formatter per quantity, used by both views and by the prose. */
const formatStep = (value: number) => `${value < 0 ? "−" : ""}${Math.abs(value)}`;
const formatDistance = (value: number) => value.toFixed(2);
const squaredTerm = (value: number) => (value < 0 ? `(${formatStep(value)})²` : `${value}²`);

/** Reads the four pin coordinates and everything derived from them. */
const useDistanceModel = () => {
    const ax = useVar<number>("distancePinAx", 1);
    const ay = useVar<number>("distancePinAy", 2);
    const bx = useVar<number>("distancePinBx", 4);
    const by = useVar<number>("distancePinBy", 6);
    const across = bx - ax;
    const up = by - ay;
    const squaredTotal = across * across + up * up;
    return { ax, ay, bx, by, across, up, squaredTotal, distance: Math.sqrt(squaredTotal) };
};

// ── Shared highlight channel — this is what makes the pair mappable ──────────
// Hovering a leg in the grid, a line in the working, or a bound phrase in the
// prose writes the SAME variable, and both drawings respond at once. The
// squares line covers both legs, so it lights them together.

const isLeg = (id: string) => id === "across" || id === "up";

const useDistanceHighlight = () => {
    const highlight = useVar<string>("distanceHighlight", "");
    const setVar = useSetVar();
    const active = (id: string) =>
        highlight === id || (highlight === "squares" && isLeg(id));
    return {
        isActive: active,
        opacity: (id: string) => (highlight && !active(id) ? 0.35 : 1),
        weight: (id: string, resting: number) => (active(id) ? resting * 1.6 : resting),
        hoverProps: (id: string) => ({
            onPointerEnter: () => setVar("distanceHighlight", id),
            onPointerLeave: () => setVar("distanceHighlight", ""),
        }),
    };
};

/** The soft halo half of the pop: a wider stroke of the same hue underneath. */
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

// ── Shared readout strip — identical in both views ───────────────────────────

function SharedReadouts() {
    const { across, up, distance } = useDistanceModel();
    const { opacity } = useDistanceHighlight();
    return (
        <g fontSize="12" style={{ ...NUMERALS, ...EASE_150 }}>
            <text x="24" y="28" fill={INK} opacity={opacity("across")}>
                {`across = ${formatStep(across)}`}
            </text>
            <text x="164" y="28" fill={INK} opacity={opacity("up")}>
                {`up = ${formatStep(up)}`}
            </text>
            <text
                x={VIEW_WIDTH - 24}
                y="28"
                fill={ACCENT}
                textAnchor="end"
                opacity={opacity("distance")}
            >
                {`d = ${formatDistance(distance)}`}
            </text>
        </g>
    );
}

// ── A draggable pin, snapped to whole grid squares ───────────────────────────

function DraggablePin({
    xVar,
    yVar,
    svgRef,
    label,
    labelAbove,
}: {
    xVar: string;
    yVar: string;
    svgRef: React.RefObject<SVGSVGElement>;
    label: string;
    labelAbove: boolean;
}) {
    const setVar = useSetVar();
    const x = useVar<number>(xVar, 0);
    const y = useVar<number>(yVar, 0);
    const [dragging, setDragging] = useState(false);
    const [hovered, setHovered] = useState(false);
    // A ref, not state: a fast drag can deliver its first pointermove before a
    // state update has flushed, and the stale closure would swallow it.
    const draggingRef = useRef(false);
    const scale = useSpring(dragging || hovered ? 1.18 : 1, { stiffness: 400, damping: 26 });

    const handlePointerMove = (event: React.PointerEvent<SVGCircleElement>) => {
        if (!draggingRef.current) return;
        const point = svgPointFromEvent(event, svgRef.current);
        setVar(xVar, clamp(Math.round((point.x - ORIGIN_X) / UNIT_PX), 0, GRID_MAX_X));
        setVar(yVar, clamp(Math.round((ORIGIN_Y - point.y) / UNIT_PX), 0, GRID_MAX_Y));
    };

    const cx = toPixelX(x);
    const cy = toPixelY(y);

    // Keep the label fully inside the viewBox: flip it to the left of the pin
    // whenever the text would otherwise run past the right-hand padding.
    const labelText = `${label} (${x}, ${y})`;
    const labelWidth = labelText.length * 7.2;
    const labelFitsRight = cx + 13 + labelWidth <= VIEW_WIDTH - 12;

    return (
        <g>
            <g transform={`translate(${cx} ${cy}) scale(${scale})`}>
                <circle r="8" fill={ACCENT} filter="url(#distance-pin-shadow)" />
            </g>
            <text
                x={labelFitsRight ? cx + 13 : cx - 13}
                y={labelAbove ? cy - 12 : cy + 21}
                textAnchor={labelFitsRight ? "start" : "end"}
                fill={INK}
                fontSize="12"
                style={NUMERALS}
            >
                {labelText}
            </text>
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

// ── VIEW A: the grid, the two pins, and the triangle underneath ──────────────

function DistanceGridDrawing() {
    const svgRef = useRef<SVGSVGElement>(null);
    const { ax, ay, bx, by } = useDistanceModel();
    const { opacity, weight, isActive, hoverProps } = useDistanceHighlight();

    const pinA: Vec2 = { x: toPixelX(ax), y: toPixelY(ay) };
    const pinB: Vec2 = { x: toPixelX(bx), y: toPixelY(by) };
    const corner: Vec2 = { x: pinB.x, y: pinA.y };
    const markSize = 9;
    const markX = corner.x + (pinA.x < corner.x ? -markSize : markSize);
    const markY = corner.y + (pinB.y < corner.y ? -markSize : markSize);

    return (
        <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            className="block w-full select-none"
            role="img"
            aria-label="Two draggable pins on a coordinate grid, joined by a sloping line with a right-angled triangle beneath it"
        >
            <defs>
                <filter id="distance-pin-shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#0F172A" floodOpacity="0.25" />
                </filter>
            </defs>

            <SharedReadouts />

            {/* Grid and axis numbers — ambient structure, always quiet. */}
            <g opacity={opacity("__structure")} style={EASE_150}>
                {Array.from({ length: GRID_MAX_X + 1 }, (_, i) => (
                    <line
                        key={`grid-x-${i}`}
                        x1={toPixelX(i)}
                        y1={toPixelY(0)}
                        x2={toPixelX(i)}
                        y2={toPixelY(GRID_MAX_Y)}
                        stroke={INK_QUIET}
                        strokeWidth="1"
                    />
                ))}
                {Array.from({ length: GRID_MAX_Y + 1 }, (_, i) => (
                    <line
                        key={`grid-y-${i}`}
                        x1={toPixelX(0)}
                        y1={toPixelY(i)}
                        x2={toPixelX(GRID_MAX_X)}
                        y2={toPixelY(i)}
                        stroke={INK_QUIET}
                        strokeWidth="1"
                    />
                ))}
                <line x1={toPixelX(0)} y1={toPixelY(0)} x2={toPixelX(GRID_MAX_X)} y2={toPixelY(0)} stroke={INK_STRUCTURE} strokeWidth="1.5" />
                <line x1={toPixelX(0)} y1={toPixelY(0)} x2={toPixelX(0)} y2={toPixelY(GRID_MAX_Y)} stroke={INK_STRUCTURE} strokeWidth="1.5" />
                <g fill={INK} fontSize="11" style={NUMERALS}>
                    {[0, 3, 6, 9].map((i) => (
                        <text key={`label-x-${i}`} x={toPixelX(i)} y={ORIGIN_Y + 18} textAnchor="middle">
                            {i}
                        </text>
                    ))}
                    {[2, 4, 6, 8].map((i) => (
                        <text key={`label-y-${i}`} x={ORIGIN_X - 9} y={toPixelY(i) + 4} textAnchor="end">
                            {i}
                        </text>
                    ))}
                </g>
            </g>

            {/* ACROSS leg — counterpart of the first line of the working. */}
            <g {...hoverProps("across")} opacity={opacity("across")} style={EASE_150}>
                <Halo active={isActive("across")}>
                    <line x1={pinA.x} y1={pinA.y} x2={corner.x} y2={corner.y} stroke={INK_STRUCTURE} strokeWidth={weight("across", 2) + 6} strokeLinecap="round" />
                </Halo>
                <line x1={pinA.x} y1={pinA.y} x2={corner.x} y2={corner.y} stroke={INK_STRUCTURE} strokeWidth={weight("across", 2)} strokeLinecap="round" />
            </g>

            {/* UP leg — counterpart of the second line of the working. */}
            <g {...hoverProps("up")} opacity={opacity("up")} style={EASE_150}>
                <Halo active={isActive("up")}>
                    <line x1={corner.x} y1={corner.y} x2={pinB.x} y2={pinB.y} stroke={INK_STRUCTURE} strokeWidth={weight("up", 2) + 6} strokeLinecap="round" />
                </Halo>
                <line x1={corner.x} y1={corner.y} x2={pinB.x} y2={pinB.y} stroke={INK_STRUCTURE} strokeWidth={weight("up", 2)} strokeLinecap="round" />
            </g>

            {/* The right-angle mark, only where the triangle actually exists. */}
            {ax !== bx && ay !== by && (
                <path
                    d={`M ${markX} ${corner.y} L ${markX} ${markY} L ${corner.x} ${markY}`}
                    fill="none"
                    stroke={INK_STRUCTURE}
                    strokeWidth="1.5"
                    opacity={opacity("__structure")}
                    style={EASE_150}
                />
            )}

            {/* DISTANCE — the slope, the one accent quantity. */}
            <g {...hoverProps("distance")} opacity={opacity("distance")} style={EASE_150}>
                <Halo active={isActive("distance")}>
                    <line x1={pinA.x} y1={pinA.y} x2={pinB.x} y2={pinB.y} stroke={ACCENT} strokeWidth={weight("distance", 3) + 6} strokeLinecap="round" />
                </Halo>
                <line x1={pinA.x} y1={pinA.y} x2={pinB.x} y2={pinB.y} stroke={ACCENT} strokeWidth={weight("distance", 3)} strokeLinecap="round" />
            </g>

            <g opacity={opacity("__structure")} style={EASE_150}>
                <DraggablePin xVar="distancePinAx" yVar="distancePinAy" svgRef={svgRef} label="cafe" labelAbove={false} />
                <DraggablePin xVar="distancePinBx" yVar="distancePinBy" svgRef={svgRef} label="library" labelAbove />
            </g>
        </svg>
    );
}

// ── VIEW B: the same three numbers, written out line by line ─────────────────

function DistanceWorkingDrawing() {
    const { ax, ay, bx, by, across, up, squaredTotal, distance } = useDistanceModel();
    const { opacity, weight, isActive, hoverProps } = useDistanceHighlight();
    const barEnd = 28 + distance * UNIT_PX;

    return (
        <svg
            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            className="block w-full select-none"
            role="img"
            aria-label="The distance calculation written out: the across step, the up step, the squared total, and the square root"
        >
            <SharedReadouts />

            {/* ACROSS line — counterpart of the horizontal leg on the grid. */}
            <g {...hoverProps("across")} opacity={opacity("across")} style={EASE_150}>
                <rect x="20" y="72" width="290" height="26" fill="transparent" />
                <text x="28" y="90" fill={INK} fontSize="14" style={NUMERALS}>
                    {`across = ${bx} − ${ax} = ${formatStep(across)}`}
                </text>
            </g>

            {/* UP line — counterpart of the vertical leg on the grid. */}
            <g {...hoverProps("up")} opacity={opacity("up")} style={EASE_150}>
                <rect x="20" y="110" width="290" height="26" fill="transparent" />
                <text x="28" y="128" fill={INK} fontSize="14" style={NUMERALS}>
                    {`up = ${by} − ${ay} = ${formatStep(up)}`}
                </text>
            </g>

            {/* SQUARES line — hovering it lights BOTH legs on the grid. */}
            <g {...hoverProps("squares")} opacity={opacity("squares")} style={EASE_150}>
                <rect x="20" y="158" width="290" height="46" fill="transparent" />
                <text x="28" y="176" fill={INK} fontSize="14" style={NUMERALS}>
                    {`${squaredTerm(across)} + ${squaredTerm(up)} = ${across * across} + ${up * up} = ${squaredTotal}`}
                </text>
                <text x="28" y="196" fill={INK_STRUCTURE} fontSize="11">
                    that total is d squared, not d
                </text>
            </g>

            {/* DISTANCE line and bar — the accent quantity in both views. */}
            <g {...hoverProps("distance")} opacity={opacity("distance")} style={EASE_150}>
                <rect x="20" y="226" width="290" height="70" fill="transparent" />
                <text x="28" y="250" fill={ACCENT} fontSize="16" style={NUMERALS}>
                    {`d = √${squaredTotal} = ${formatDistance(distance)}`}
                </text>
                <Halo active={isActive("distance")}>
                    <line x1="28" y1="282" x2={barEnd} y2="282" stroke={ACCENT} strokeWidth={weight("distance", 3) + 6} strokeLinecap="round" />
                </Halo>
                <line x1="28" y1="282" x2={barEnd} y2="282" stroke={ACCENT} strokeWidth={weight("distance", 3)} strokeLinecap="round" />
                <text x="28" y="304" fill={INK_STRUCTURE} fontSize="11">
                    drawn to the same scale as the grid
                </text>
            </g>
        </svg>
    );
}

// ── Figure shells ────────────────────────────────────────────────────────────

const resetPins = (setVar: (name: string, value: number | string) => void) => {
    setVar("distancePinAx", 1);
    setVar("distancePinAy", 2);
    setVar("distancePinBx", 4);
    setVar("distancePinBy", 6);
    setVar("distanceHighlight", "");
};

function DistanceGridFigure() {
    const setVar = useSetVar();
    return (
        <Figure
            id="distance-grid"
            onReset={() => resetPins(setVar)}
            caption="Drag either teal pin. Going across and then up builds a right-angled triangle, and the teal slope joining the pins is the distance."
        >
            <DistanceGridDrawing />
            <InteractionHintSequence
                hintKey="distance-grid-drag-pin"
                steps={[
                    {
                        gesture: "drag",
                        label: "Drag the teal library pin",
                        position: { x: "46%", y: "39%" },
                        dragPath: { type: "line", startOffset: { x: -22, y: 12 }, endOffset: { x: 22, y: -12 } },
                    },
                ]}
            />
        </Figure>
    );
}

function DistanceWorkingFigure() {
    const setVar = useSetVar();
    return (
        <Figure
            id="distance-working"
            onReset={() => resetPins(setVar)}
            caption="The same three numbers, written out. Hover any line to light up the part of the grid it came from, or slide the library pin across from here."
        >
            <DistanceWorkingDrawing />
            <div className="px-6 pb-5">
                <FigureSlider
                    varName="distancePinBx"
                    label="Library pin, across"
                    {...numberPropsFromDefinition(getVariableInfo("distancePinBx"))}
                    formatValue={(value) => `${value}`}
                />
            </div>
        </Figure>
    );
}

// ── Live numbers used inside the prose ───────────────────────────────────────

function LiveSquaredTotal() {
    const { squaredTotal } = useDistanceModel();
    return <span style={NUMERALS}>{squaredTotal}</span>;
}

function LiveDistance() {
    const { distance } = useDistanceModel();
    return (
        <span style={{ ...NUMERALS, color: ACCENT, fontWeight: 600 }}>
            {formatDistance(distance)}
        </span>
    );
}

export const distanceBetweenPointsBlocks: ReactElement[] = [
    <StackLayout key="layout-part-distance-midpoint-heading" maxWidth="xl">
        <Block id="part-distance-midpoint-heading" padding="md">
            <EditableH2 id="h2-part-distance-midpoint-heading" blockId="part-distance-midpoint-heading">
                Part 1 · Distance and Midpoint
            </EditableH2>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-distance-heading" maxWidth="xl">
        <Block id="distance-heading" padding="sm">
            <EditableH3 id="h3-distance-heading" blockId="distance-heading">
                Distance Between Two Points
            </EditableH3>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-distance-setup" maxWidth="xl">
        <Block id="distance-setup" padding="sm">
            <EditableParagraph id="para-distance-setup" blockId="distance-setup">Two pins on a map are hardly ever straight across or straight up from each other, so counting squares will not do it. Travel <InlineLinkedHighlight varName={"distanceHighlight"} highlightId={"across"} color={"#FDD835"} bgColor={"rgba(98, 208, 173, 0.22)"} id={"linkedHighlight-1788005314634-0fwvg"}>across</InlineLinkedHighlight>, then travel <InlineLinkedHighlight varName={"distanceHighlight"} highlightId={"up"} color={"#FDD835"} bgColor={"rgba(98, 208, 173, 0.22)"} id={"linkedHighlight-1788005314637-tgaz0"}>up</InlineLinkedHighlight>, and those two moves build a right-angled triangle with the pins at the ends of the slope. Drag either <InlineSpotColor varName={"distancePinBx"} color={"#62D0AD"} id={"spotColor-1788005314641-q89ls"}>teal pin</InlineSpotColor> and watch the working rebuild itself line by line.</EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-distance-formula" maxWidth="xl">
        <Block id="distance-formula" padding="lg">
            <FormulaBlock
                latex="\highlight{distance}{d} = \sqrt{\highlight{across}{(x_2 - x_1)^2} + \highlight{up}{(y_2 - y_1)^2}}"
                linkedHighlights={{
                    distance: { varName: "distanceHighlight", color: ACCENT, bgColor: "rgba(98, 208, 173, 0.22)" },
                    across: { varName: "distanceHighlight", color: ACCENT, bgColor: "rgba(98, 208, 173, 0.22)" },
                    up: { varName: "distanceHighlight", color: ACCENT, bgColor: "rgba(98, 208, 173, 0.22)" },
                }}
            />
        </Block>
    </StackLayout>,

    // BOTH VIEWS VISIBLE AT ONCE — one source of truth, never tabs.
    <SplitLayout key="layout-distance-linked-pair" ratio="1:1" gap="lg" align="start">
        <Block id="distance-grid-figure" padding="sm" hasVisualization>
            <DistanceGridFigure />
        </Block>
        <Block id="distance-working-figure" padding="sm" hasVisualization>
            <DistanceWorkingFigure />
        </Block>
    </SplitLayout>,

    <StackLayout key="layout-distance-worked-example" maxWidth="xl">
        <Block id="distance-worked-example" padding="sm">
            <EditableParagraph id="para-distance-worked-example" blockId="distance-worked-example">
                Squaring the two steps and adding them gives d squared, not d. With the library
                pin at (
                <InlineScrubbleNumber
                    varName="distancePinBx"
                    {...numberPropsFromDefinition(getVariableInfo("distancePinBx"))}
                />
                ,{" "}
                <InlineScrubbleNumber
                    varName="distancePinBy"
                    {...numberPropsFromDefinition(getVariableInfo("distancePinBy"))}
                />
                ) the two squares add to <LiveSquaredTotal />, and the square root of that,{" "}
                <LiveDistance />, is the real{" "}
                <InlineLinkedHighlight
                    varName="distanceHighlight"
                    highlightId="distance"
                    {...linkedHighlightPropsFromDefinition(getVariableInfo("distanceHighlight"))}
                >
                    distance
                </InlineLinkedHighlight>
                . Stop at the total and you would report a number several times too big.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-distance-question-root" maxWidth="xl">
        <Block id="distance-question-root" padding="md">
            <EditableParagraph id="para-distance-question-root" blockId="distance-question-root">
                A skate ramp sits at (0, 1) and a bench at (8, 7), so the across step is 8, the up
                step is 6, and the two squares add to 100. The straight-line distance between the
                ramp and the bench is{" "}
                <InlineFeedback
                    varName="answerDistanceRoot"
                    correctValue="10"
                    position="terminal"
                    successMessage="— exactly, the square root of 100 is 10, so the ramp and the bench are 10 apart"
                    failureMessage="— not quite."
                    hint="100 is the two squares added together, which makes it d squared rather than d"
                    visualizationHint={{
                        blockId: "distance-grid-figure",
                        hintKey: "distance-question-root-hint",
                        label: "Discover it yourself",
                        resetVars: { distancePinAx: 1, distancePinAy: 2, distancePinBx: 4, distancePinBy: 6 },
                        steps: [
                            {
                                gesture: "drag",
                                label: "Drag the library pin to (8, 7) — watch the squared total climb to 100",
                                position: { x: "46%", y: "39%" },
                                completionVar: "distancePinBx",
                                completionValue: 8,
                                completionTolerance: 0.5,
                            },
                            {
                                gesture: "drag",
                                label: "Now drag the cafe pin down to (0, 1) — read the last line of the working",
                                position: { x: "26%", y: "66%" },
                                completionVar: "distancePinAx",
                                completionValue: 0,
                                completionTolerance: 0.5,
                            },
                        ],
                    }}
                >
                    <InlineClozeInput
                        varName="answerDistanceRoot"
                        correctAnswer="10"
                        {...clozePropsFromDefinition(getVariableInfo("answerDistanceRoot"))}
                    />
                </InlineFeedback>.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-distance-question-apply" maxWidth="xl">
        <Block id="distance-question-apply" padding="md">
            <EditableParagraph id="para-distance-question-apply" blockId="distance-question-apply">
                Two more pins sit at (2, 1) and (5, 5), with no working written out this time. The
                distance between them is{" "}
                <InlineFeedback
                    varName="answerDistanceApply"
                    correctValue="5"
                    position="terminal"
                    successMessage="— spot on, the steps are 3 and 4, the squares add to 25, and the square root of 25 is 5"
                    failureMessage="— almost."
                    hint="find the across step and the up step first, then square them, add them, and root the total"
                    visualizationHint={{
                        blockId: "distance-grid-figure",
                        hintKey: "distance-question-apply-hint",
                        label: "Discover it yourself",
                        resetVars: { distancePinAx: 2, distancePinAy: 1, distancePinBx: 8, distancePinBy: 2 },
                        steps: [
                            {
                                gesture: "drag-horizontal",
                                label: "Drag the library pin left until it sits above 5",
                                position: { x: "72%", y: "66%" },
                                completionVar: "distancePinBx",
                                completionValue: 5,
                                completionTolerance: 0.5,
                            },
                            {
                                gesture: "drag-vertical",
                                label: "Now lift that same pin up to 5 — the working does the rest",
                                position: { x: "52%", y: "66%" },
                                completionVar: "distancePinBy",
                                completionValue: 5,
                                completionTolerance: 0.5,
                            },
                        ],
                    }}
                >
                    <InlineClozeInput
                        varName="answerDistanceApply"
                        correctAnswer="5"
                        {...clozePropsFromDefinition(getVariableInfo("answerDistanceApply"))}
                    />
                </InlineFeedback>.
            </EditableParagraph>
        </Block>
    </StackLayout>,
];

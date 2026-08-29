import React, { useRef, useState, type ReactElement } from "react";
import { Block } from "@/components/templates";
import { StackLayout } from "@/components/layouts";
import {
    EditableH3,
    EditableParagraph,
    InlineClozeChoice,
    InlineClozeInput,
    InlineFeedback,
    InlineLinkedHighlight,
    InteractionHintSequence,
} from "@/components/atoms";
import { Figure, FormulaBlock } from "@/components/molecules";
import { useVar, useSetVar } from "@/stores";
import { clamp, useSpring, type Vec2 } from "@/lib/motion";
import {
    choicePropsFromDefinition,
    clozePropsFromDefinition,
    getVariableInfo,
    linkedHighlightPropsFromDefinition,
} from "../variables";

// ── View geometry ────────────────────────────────────────────────────────────
// Grid on the left, the two competing methods written out on the right. The
// panel gutter was reserved before the grid was sized, so no line of working
// can run past the edge of the viewBox.

const VIEW_WIDTH = 560;
const VIEW_HEIGHT = 340;
const UNIT_PX = 30;
const ORIGIN_X = 56;
const ORIGIN_Y = 300;
const GRID_MAX_X = 9;
const GRID_MAX_Y = 8;
const GRID_RIGHT = ORIGIN_X + GRID_MAX_X * UNIT_PX; // 326
const PANEL_X = 360;

const INK = "#334155";
const INK_STRUCTURE = "#64748B";
const INK_QUIET = "#CBD5E1";
const ACCENT = "#62D0AD";

const EASE_150 = { transition: "opacity 150ms ease, stroke-width 150ms ease" } as const;
const NUMERALS = { fontVariantNumeric: "tabular-nums" } as const;

const toPixelX = (x: number) => ORIGIN_X + x * UNIT_PX;
const toPixelY = (y: number) => ORIGIN_Y - y * UNIT_PX;

/** One formatter per quantity, shared by the drawing and the prose. */
const formatCoordinate = (value: number) =>
    Number.isInteger(value) ? `${value}` : value.toFixed(1);
const formatSigned = (value: number) =>
    `${value < 0 ? "−" : ""}${Math.abs(value)}`;

const useMidpointModel = () => {
    const ax = useVar<number>("midpointPinAx", 1);
    const ay = useVar<number>("midpointPinAy", 1);
    const bx = useVar<number>("midpointPinBx", 6);
    const by = useVar<number>("midpointPinBy", 7);
    const subtractX = bx - ax;
    const subtractY = by - ay;
    return {
        ax, ay, bx, by,
        middleX: (ax + bx) / 2,
        middleY: (ay + by) / 2,
        subtractX,
        subtractY,
        // The subtracted answer only lands on the grid when it happens to be
        // positive; when it does not, the panel says so rather than hiding it.
        subtractOnGrid:
            subtractX >= 0 && subtractX <= GRID_MAX_X && subtractY >= 0 && subtractY <= GRID_MAX_Y,
    };
};

// ── Highlight channel shared by the drawing, the formula and the prose ───────

const useMidpointHighlight = () => {
    const highlight = useVar<string>("midpointHighlight", "");
    const setVar = useSetVar();
    const active = (id: string) => highlight === id;
    return {
        isActive: active,
        opacity: (id: string) => (highlight && !active(id) ? 0.35 : 1),
        weight: (id: string, resting: number) => (active(id) ? resting * 1.6 : resting),
        hoverProps: (id: string) => ({
            onPointerEnter: () => setVar("midpointHighlight", id),
            onPointerLeave: () => setVar("midpointHighlight", ""),
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

/** Keeps a label inside the viewBox by flipping it left near the grid edge. */
const labelPlacement = (cx: number, text: string) => {
    const fitsRight = cx + 13 + text.length * 7.2 <= GRID_RIGHT + 14;
    return { x: fitsRight ? cx + 13 : cx - 13, anchor: fitsRight ? "start" : "end" } as const;
};

// ── The two draggable pins, snapped to whole grid squares ────────────────────

function MidpointPin({
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
    const labelText = `${label} (${x}, ${y})`;
    const place = labelPlacement(cx, labelText);

    return (
        <g>
            <g transform={`translate(${cx} ${cy}) scale(${scale})`}>
                <circle r="8" fill={INK_STRUCTURE} filter="url(#midpoint-pin-shadow)" />
            </g>
            <text
                x={place.x}
                y={labelAbove ? cy - 12 : cy + 22}
                textAnchor={place.anchor}
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

// ── The drawing: one line, two competing answers ─────────────────────────────

function MidpointDrawing() {
    const svgRef = useRef<SVGSVGElement>(null);
    const {
        ax, ay, bx, by, middleX, middleY, subtractX, subtractY, subtractOnGrid,
    } = useMidpointModel();
    const { opacity, weight, isActive, hoverProps } = useMidpointHighlight();

    const pinA: Vec2 = { x: toPixelX(ax), y: toPixelY(ay) };
    const pinB: Vec2 = { x: toPixelX(bx), y: toPixelY(by) };
    const middle: Vec2 = { x: toPixelX(middleX), y: toPixelY(middleY) };
    const subtracted: Vec2 = { x: toPixelX(subtractX), y: toPixelY(subtractY) };

    const middlePlace = labelPlacement(middle.x, "middle");
    const subtractPlace = labelPlacement(subtracted.x, "subtracting");

    return (
        <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            className="block w-full select-none"
            role="img"
            aria-label="Two draggable pins joined by a line, with the averaged middle marked in teal and the subtracted answer marked in grey"
        >
            <defs>
                <filter id="midpoint-pin-shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#0F172A" floodOpacity="0.25" />
                </filter>
            </defs>

            {/* Grid and axis numbers — ambient structure, always quiet. */}
            <g opacity={opacity("__structure")} style={EASE_150}>
                {Array.from({ length: GRID_MAX_X + 1 }, (_, i) => (
                    <line key={`grid-x-${i}`} x1={toPixelX(i)} y1={toPixelY(0)} x2={toPixelX(i)} y2={toPixelY(GRID_MAX_Y)} stroke={INK_QUIET} strokeWidth="1" />
                ))}
                {Array.from({ length: GRID_MAX_Y + 1 }, (_, i) => (
                    <line key={`grid-y-${i}`} x1={toPixelX(0)} y1={toPixelY(i)} x2={toPixelX(GRID_MAX_X)} y2={toPixelY(i)} stroke={INK_QUIET} strokeWidth="1" />
                ))}
                <line x1={toPixelX(0)} y1={toPixelY(0)} x2={toPixelX(GRID_MAX_X)} y2={toPixelY(0)} stroke={INK_STRUCTURE} strokeWidth="1.5" />
                <line x1={toPixelX(0)} y1={toPixelY(0)} x2={toPixelX(0)} y2={toPixelY(GRID_MAX_Y)} stroke={INK_STRUCTURE} strokeWidth="1.5" />
                <g fill={INK} fontSize="11" style={NUMERALS}>
                    {[0, 3, 6, 9].map((i) => (
                        <text key={`label-x-${i}`} x={toPixelX(i)} y={ORIGIN_Y + 20} textAnchor="middle">{i}</text>
                    ))}
                    {[2, 4, 6, 8].map((i) => (
                        <text key={`label-y-${i}`} x={ORIGIN_X - 10} y={toPixelY(i) + 4} textAnchor="end">{i}</text>
                    ))}
                </g>
            </g>

            {/* The line joining the two pins. */}
            <g {...hoverProps("join")} opacity={opacity("join")} style={EASE_150}>
                <Halo active={isActive("join")}>
                    <line x1={pinA.x} y1={pinA.y} x2={pinB.x} y2={pinB.y} stroke={INK_STRUCTURE} strokeWidth={weight("join", 2) + 6} strokeLinecap="round" />
                </Halo>
                <line x1={pinA.x} y1={pinA.y} x2={pinB.x} y2={pinB.y} stroke={INK_STRUCTURE} strokeWidth={weight("join", 2)} strokeLinecap="round" />
            </g>

            {/* SUBTRACTING — the wrong answer, drawn wherever it lands. */}
            {subtractOnGrid && (
                <g {...hoverProps("subtract")} opacity={opacity("subtract")} style={EASE_150}>
                    <Halo active={isActive("subtract")}>
                        <circle cx={subtracted.x} cy={subtracted.y} r="7" fill="none" stroke={INK_STRUCTURE} strokeWidth="12" />
                    </Halo>
                    <circle
                        cx={subtracted.x}
                        cy={subtracted.y}
                        r={isActive("subtract") ? 9 : 7}
                        fill="#FFFFFF"
                        stroke={INK_STRUCTURE}
                        strokeWidth={weight("subtract", 2)}
                        strokeDasharray="4 3"
                        style={EASE_150}
                    />
                    <text
                        x={subtractPlace.x}
                        y={subtracted.y + 22}
                        textAnchor={subtractPlace.anchor}
                        fill={INK_STRUCTURE}
                        fontSize="11"
                    >
                        subtracting
                    </text>
                </g>
            )}

            {/* AVERAGING — the right answer, in the one accent hue. */}
            <g {...hoverProps("average")} opacity={opacity("average")} style={EASE_150}>
                <Halo active={isActive("average")}>
                    <circle cx={middle.x} cy={middle.y} r="8" fill="none" stroke={ACCENT} strokeWidth="12" />
                </Halo>
                <circle cx={middle.x} cy={middle.y} r={isActive("average") ? 10 : 8} fill={ACCENT} filter="url(#midpoint-pin-shadow)" style={EASE_150} />
                <text
                    x={middlePlace.x}
                    y={middle.y - 13}
                    textAnchor={middlePlace.anchor}
                    fill={ACCENT}
                    fontSize="11"
                >
                    middle
                </text>
            </g>

            <g opacity={opacity("__structure")} style={EASE_150}>
                <MidpointPin xVar="midpointPinAx" yVar="midpointPinAy" svgRef={svgRef} label="park" labelAbove={false} />
                <MidpointPin xVar="midpointPinBx" yVar="midpointPinBy" svgRef={svgRef} label="shop" labelAbove />
            </g>

            {/* The two methods, written out side by side. */}
            <g {...hoverProps("average")} opacity={opacity("average")} style={EASE_150}>
                <rect x={PANEL_X - 8} y="46" width="190" height="100" fill="transparent" />
                <text x={PANEL_X} y="62" fill={INK_STRUCTURE} fontSize="11">
                    averaging
                </text>
                <text x={PANEL_X} y="88" fill={INK} fontSize="13" style={NUMERALS}>
                    {`x: (${ax} + ${bx}) ÷ 2 = ${formatCoordinate(middleX)}`}
                </text>
                <text x={PANEL_X} y="110" fill={INK} fontSize="13" style={NUMERALS}>
                    {`y: (${ay} + ${by}) ÷ 2 = ${formatCoordinate(middleY)}`}
                </text>
                <text x={PANEL_X} y="136" fill={ACCENT} fontSize="14" style={NUMERALS}>
                    {`middle (${formatCoordinate(middleX)}, ${formatCoordinate(middleY)})`}
                </text>
            </g>

            <g {...hoverProps("subtract")} opacity={opacity("subtract")} style={EASE_150}>
                <rect x={PANEL_X - 8} y="164" width="190" height="140" fill="transparent" />
                <text x={PANEL_X} y="180" fill={INK_STRUCTURE} fontSize="11">
                    subtracting
                </text>
                <text x={PANEL_X} y="206" fill={INK} fontSize="13" style={NUMERALS}>
                    {`x: ${bx} − ${ax} = ${formatSigned(subtractX)}`}
                </text>
                <text x={PANEL_X} y="228" fill={INK} fontSize="13" style={NUMERALS}>
                    {`y: ${by} − ${ay} = ${formatSigned(subtractY)}`}
                </text>
                <text x={PANEL_X} y="254" fill={INK_STRUCTURE} fontSize="14" style={NUMERALS}>
                    {`gives (${formatSigned(subtractX)}, ${formatSigned(subtractY)})`}
                </text>
                <text x={PANEL_X} y="278" fill={INK_STRUCTURE} fontSize="11">
                    that is how far apart
                </text>
                <text x={PANEL_X} y="296" fill={INK_STRUCTURE} fontSize="11">
                    {subtractOnGrid ? "they are, not a place" : "they are, and it is off"}
                </text>
                {!subtractOnGrid && (
                    <text x={PANEL_X} y="314" fill={INK_STRUCTURE} fontSize="11">
                        the grid entirely
                    </text>
                )}
            </g>
        </svg>
    );
}

function MidpointFigure() {
    const setVar = useSetVar();
    return (
        <Figure
            id="midpoint-compare"
            onReset={() => {
                setVar("midpointPinAx", 1);
                setVar("midpointPinAy", 1);
                setVar("midpointPinBx", 6);
                setVar("midpointPinBy", 7);
                setVar("midpointHighlight", "");
            }}
            caption="Drag either grey pin. The teal marker, worked out by averaging, never leaves the middle of the line, while the dashed marker from subtracting wanders off on its own."
        >
            <MidpointDrawing />
            <InteractionHintSequence
                hintKey="midpoint-drag-pin"
                steps={[
                    {
                        gesture: "drag",
                        label: "Drag the shop pin and watch both markers",
                        position: { x: "42%", y: "23%" },
                        dragPath: { type: "line", startOffset: { x: -20, y: -14 }, endOffset: { x: 20, y: 14 } },
                    },
                ]}
            />
        </Figure>
    );
}

// ── Live numbers used inside the prose ───────────────────────────────────────

function LiveSubtractedGap() {
    const { ax, bx, subtractX } = useMidpointModel();
    return <span style={NUMERALS}>{`${bx} − ${ax} = ${formatSigned(subtractX)}`}</span>;
}

function LiveAveragedMiddle() {
    const { ax, bx, middleX } = useMidpointModel();
    return (
        <span style={{ ...NUMERALS, color: ACCENT, fontWeight: 600 }}>
            {`(${ax} + ${bx}) ÷ 2 = ${formatCoordinate(middleX)}`}
        </span>
    );
}

export const findingMidpointBlocks: ReactElement[] = [
    <StackLayout key="layout-midpoint-heading" maxWidth="xl">
        <Block id="midpoint-heading" padding="md">
            <EditableH3 id="h3-midpoint-heading" blockId="midpoint-heading">
                Finding the Midpoint
            </EditableH3>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-midpoint-setup" maxWidth="xl">
        <Block id="midpoint-setup" padding="sm">
            <EditableParagraph id="para-midpoint-setup" blockId="midpoint-setup">
                Now suppose you want the meeting spot exactly halfway between the two pins.
                Halfway between two numbers is simply their{" "}
                <InlineLinkedHighlight
                    varName="midpointHighlight"
                    highlightId="average"
                    {...linkedHighlightPropsFromDefinition(getVariableInfo("midpointHighlight"))}
                >
                    average
                </InlineLinkedHighlight>
                : add them, then halve. Drag either grey pin and watch the teal marker stay on the
                line while the marker from{" "}
                <InlineLinkedHighlight
                    varName="midpointHighlight"
                    highlightId="subtract"
                    {...linkedHighlightPropsFromDefinition(getVariableInfo("midpointHighlight"))}
                >
                    subtracting
                </InlineLinkedHighlight>{" "}
                drifts away.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-midpoint-formula" maxWidth="xl">
        <Block id="midpoint-formula" padding="lg">
            <FormulaBlock latex="M = \left( \frac{x_1 + x_2}{2},\ \frac{y_1 + y_2}{2} \right)" />
        </Block>
    </StackLayout>,

    <StackLayout key="layout-midpoint-figure" maxWidth="xl">
        <Block id="midpoint-figure" padding="sm" hasVisualization>
            <MidpointFigure />
        </Block>
    </StackLayout>,

    <StackLayout key="layout-midpoint-worked-example" maxWidth="xl">
        <Block id="midpoint-worked-example" padding="sm">
            <EditableParagraph id="para-midpoint-worked-example" blockId="midpoint-worked-example">
                Do that for the x values, then again for the y values, and you have the midpoint.
                Subtracting is the tempting mistake here, because subtracting is exactly what we
                did for distance. But <LiveSubtractedGap /> tells you how far apart the two x
                values are, while <LiveAveragedMiddle /> tells you where the{" "}
                <InlineLinkedHighlight
                    varName="midpointHighlight"
                    highlightId="average"
                    {...linkedHighlightPropsFromDefinition(getVariableInfo("midpointHighlight"))}
                >
                    middle
                </InlineLinkedHighlight>{" "}
                is.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-midpoint-question-average" maxWidth="xl">
        <Block id="midpoint-question-average" padding="md">
            <EditableParagraph id="para-midpoint-question-average" blockId="midpoint-question-average">
                A bus stop sits at (2, 3) and a gate at (7, 8). The x coordinate of the midpoint
                between them is{" "}
                <InlineFeedback
                    varName="answerMidpointAverage"
                    correctValue={["4.5", "4 1/2", "9/2"]}
                    position="terminal"
                    successMessage="— exactly, 2 and 7 add to 9, and half of 9 is 4.5, which sits neatly between them"
                    failureMessage="— not quite."
                    hint="add the two x values first, then halve the total, and do not be put off by a half"
                    visualizationHint={{
                        blockId: "midpoint-figure",
                        hintKey: "midpoint-question-average-hint",
                        label: "Discover it yourself",
                        resetVars: {
                            midpointPinAx: 2,
                            midpointPinAy: 3,
                            midpointPinBx: 9,
                            midpointPinBy: 3,
                        },
                        steps: [
                            {
                                gesture: "drag-horizontal",
                                label: "Drag the shop pin left until it sits above 7",
                                position: { x: "63%", y: "63%" },
                                completionVar: "midpointPinBx",
                                completionValue: 7,
                                completionTolerance: 0.4,
                            },
                            {
                                gesture: "drag-vertical",
                                label: "Now lift that pin up to 8 and read the x line of the averaging working",
                                position: { x: "50%", y: "63%" },
                                completionVar: "midpointPinBy",
                                completionValue: 8,
                                completionTolerance: 0.4,
                            },
                        ],
                    }}
                >
                    <InlineClozeInput
                        varName="answerMidpointAverage"
                        correctAnswer={["4.5", "4 1/2", "9/2"]}
                        {...clozePropsFromDefinition(getVariableInfo("answerMidpointAverage"))}
                    />
                </InlineFeedback>.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-midpoint-question-subtract" maxWidth="xl">
        <Block id="midpoint-question-subtract" padding="md">
            <EditableParagraph id="para-midpoint-question-subtract" blockId="midpoint-question-subtract">
                Subtracting those same two x values gives 7 − 2 = 5, and that 5 tells you{" "}
                <InlineFeedback
                    varName="answerMidpointSubtract"
                    correctValue="how far apart the two x values are"
                    position="terminal"
                    successMessage="— right, subtracting measures a gap, and a gap is a length rather than a place on the grid"
                    failureMessage="— have another look."
                    hint="5 is bigger than either coordinate of the middle, so it cannot be sitting between the two pins"
                    visualizationHint={{
                        blockId: "midpoint-figure",
                        hintKey: "midpoint-question-subtract-hint",
                        label: "Discover it yourself",
                        resetVars: {
                            midpointPinAx: 2,
                            midpointPinAy: 3,
                            midpointPinBx: 9,
                            midpointPinBy: 3,
                        },
                        steps: [
                            {
                                gesture: "drag-horizontal",
                                label: "Drag the shop pin left until it sits above 7",
                                position: { x: "63%", y: "63%" },
                                completionVar: "midpointPinBx",
                                completionValue: 7,
                                completionTolerance: 0.4,
                            },
                            {
                                gesture: "drag-vertical",
                                label: "Lift it to 8, then compare where the teal marker sits with the dashed one",
                                position: { x: "50%", y: "63%" },
                                completionVar: "midpointPinBy",
                                completionValue: 8,
                                completionTolerance: 0.4,
                            },
                        ],
                    }}
                >
                    <InlineClozeChoice
                        varName="answerMidpointSubtract"
                        correctAnswer="how far apart the two x values are"
                        options={[
                            "how far apart the two x values are",
                            "the x coordinate of the midpoint",
                            "the x coordinate of the gate",
                        ]}
                        {...choicePropsFromDefinition(getVariableInfo("answerMidpointSubtract"))}
                    />
                </InlineFeedback>.
            </EditableParagraph>
        </Block>
    </StackLayout>,
];

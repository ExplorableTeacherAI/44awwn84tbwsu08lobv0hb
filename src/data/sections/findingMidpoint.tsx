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
// Grid on the left, the working panel on the right, gutters reserved before the
// plot was sized so no label can run past the edge of the viewBox.

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
const formatGap = (value: number) => value.toFixed(1);

const useMidpointModel = () => {
    const ax = useVar<number>("midpointPinAx", 1);
    const ay = useVar<number>("midpointPinAy", 1);
    const bx = useVar<number>("midpointPinBx", 6);
    const by = useVar<number>("midpointPinBy", 7);
    const guessX = useVar<number>("midpointGuessX", 4.5);
    const guessY = useVar<number>("midpointGuessY", 5);
    const revealed = useVar<boolean>("midpointRevealed", false);
    const middleX = (ax + bx) / 2;
    const middleY = (ay + by) / 2;
    return {
        ax, ay, bx, by, guessX, guessY, revealed, middleX, middleY,
        gap: Math.hypot(guessX - middleX, guessY - middleY),
    };
};

// ── Shared highlight channel ─────────────────────────────────────────────────

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

// ── The two pins, snapped to whole grid squares ──────────────────────────────

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
    const draggingRef = useRef(false);
    const scale = useSpring(dragging || hovered ? 1.18 : 1, { stiffness: 400, damping: 26 });

    const handlePointerMove = (event: React.PointerEvent<SVGCircleElement>) => {
        if (!draggingRef.current) return;
        const point = svgPointFromEvent(event, svgRef.current);
        setVar(xVar, clamp(Math.round((point.x - ORIGIN_X) / UNIT_PX), 0, GRID_MAX_X));
        setVar(yVar, clamp(Math.round((ORIGIN_Y - point.y) / UNIT_PX), 0, GRID_MAX_Y));
        // Moving a pin poses a fresh question, so the answer hides again.
        setVar("midpointRevealed", false);
    };

    const cx = toPixelX(x);
    const cy = toPixelY(y);
    const labelText = `${label} (${x}, ${y})`;
    const labelWidth = labelText.length * 7.2;
    const labelFitsRight = cx + 13 + labelWidth <= GRID_RIGHT + 14;

    return (
        <g>
            <g transform={`translate(${cx} ${cy}) scale(${scale})`}>
                <circle r="8" fill={INK_STRUCTURE} filter="url(#midpoint-pin-shadow)" />
            </g>
            <text
                x={labelFitsRight ? cx + 13 : cx - 13}
                y={labelAbove ? cy - 12 : cy + 22}
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

// ── The hollow guess marker: the whole point of the figure ───────────────────

function GuessMarker({ svgRef }: { svgRef: React.RefObject<SVGSVGElement> }) {
    const setVar = useSetVar();
    const { guessX, guessY } = useMidpointModel();
    const { opacity, weight, isActive, hoverProps } = useMidpointHighlight();
    const [dragging, setDragging] = useState(false);
    const [hovered, setHovered] = useState(false);
    const draggingRef = useRef(false);
    const scale = useSpring(dragging || hovered ? 1.2 : 1, { stiffness: 400, damping: 26 });

    const handlePointerMove = (event: React.PointerEvent<SVGCircleElement>) => {
        if (!draggingRef.current) return;
        const point = svgPointFromEvent(event, svgRef.current);
        // Half squares, because a midpoint often lands between two lines.
        setVar("midpointGuessX", clamp(Math.round((point.x - ORIGIN_X) / UNIT_PX * 2) / 2, 0, GRID_MAX_X));
        setVar("midpointGuessY", clamp(Math.round((ORIGIN_Y - point.y) / UNIT_PX * 2) / 2, 0, GRID_MAX_Y));
    };

    const cx = toPixelX(guessX);
    const cy = toPixelY(guessY);

    return (
        <g {...hoverProps("guess")} opacity={opacity("guess")} style={EASE_150}>
            <Halo active={isActive("guess")}>
                <circle cx={cx} cy={cy} r="10" fill="none" stroke={ACCENT} strokeWidth={weight("guess", 2) + 6} />
            </Halo>
            <g transform={`translate(${cx} ${cy}) scale(${scale})`}>
                <circle
                    r="10"
                    fill="#FFFFFF"
                    stroke={ACCENT}
                    strokeWidth={weight("guess", 2)}
                    strokeDasharray="4 3"
                />
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
                    setVar("midpointRevealed", false);
                }}
                onPointerMove={handlePointerMove}
                onPointerUp={() => {
                    draggingRef.current = false;
                    setDragging(false);
                    setVar("midpointRevealed", true);
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

// ── The drawing ──────────────────────────────────────────────────────────────

function MidpointDrawing() {
    const svgRef = useRef<SVGSVGElement>(null);
    const { ax, ay, bx, by, guessX, guessY, revealed, middleX, middleY, gap } = useMidpointModel();
    const { opacity, weight, isActive, hoverProps } = useMidpointHighlight();

    const pinA: Vec2 = { x: toPixelX(ax), y: toPixelY(ay) };
    const pinB: Vec2 = { x: toPixelX(bx), y: toPixelY(by) };
    const middle: Vec2 = { x: toPixelX(middleX), y: toPixelY(middleY) };
    const guess: Vec2 = { x: toPixelX(guessX), y: toPixelY(guessY) };
    const spotOn = gap < 0.01;

    return (
        <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            className="block w-full select-none"
            role="img"
            aria-label="Two pins joined by a line on a grid, with a hollow marker the student drops where they think the middle is"
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

            {/* The reveal: the true middle, plus the gap back to the guess. */}
            {revealed && (
                <g {...hoverProps("middle")} opacity={opacity("middle")} style={EASE_150}>
                    {!spotOn && (
                        <line x1={guess.x} y1={guess.y} x2={middle.x} y2={middle.y} stroke={ACCENT} strokeWidth="1.5" strokeDasharray="3 4" opacity={0.7} />
                    )}
                    <Halo active={isActive("middle")}>
                        <circle cx={middle.x} cy={middle.y} r="8" fill="none" stroke={ACCENT} strokeWidth="12" />
                    </Halo>
                    <circle cx={middle.x} cy={middle.y} r={isActive("middle") ? 10 : 8} fill={ACCENT} filter="url(#midpoint-pin-shadow)" style={EASE_150} />
                </g>
            )}

            <g opacity={opacity("__structure")} style={EASE_150}>
                <MidpointPin xVar="midpointPinAx" yVar="midpointPinAy" svgRef={svgRef} label="park" labelAbove={false} />
                <MidpointPin xVar="midpointPinBx" yVar="midpointPinBy" svgRef={svgRef} label="shop" labelAbove />
            </g>

            <GuessMarker svgRef={svgRef} />

            {/* The working panel — gutters reserved, every label anchored start
                at x = 360 with room to spare inside the 560-wide viewBox. */}
            {revealed ? (
                <>
                    <g {...hoverProps("middle")} opacity={opacity("middle")} style={EASE_150}>
                        <rect x={PANEL_X - 8} y="72" width="190" height="110" fill="transparent" />
                        <text x={PANEL_X} y="92" fill={INK} fontSize="13" style={NUMERALS}>
                            {`x: (${ax} + ${bx}) ÷ 2 = ${formatCoordinate(middleX)}`}
                        </text>
                        <text x={PANEL_X} y="118" fill={INK} fontSize="13" style={NUMERALS}>
                            {`y: (${ay} + ${by}) ÷ 2 = ${formatCoordinate(middleY)}`}
                        </text>
                        <text x={PANEL_X} y="162" fill={ACCENT} fontSize="14" style={NUMERALS}>
                            {`middle = (${formatCoordinate(middleX)}, ${formatCoordinate(middleY)})`}
                        </text>
                    </g>
                    <g {...hoverProps("guess")} opacity={opacity("guess")} style={EASE_150}>
                        <rect x={PANEL_X - 8} y="188" width="190" height="52" fill="transparent" />
                        <text x={PANEL_X} y="208" fill={INK} fontSize="12" style={NUMERALS}>
                            {`your guess: (${formatCoordinate(guessX)}, ${formatCoordinate(guessY)})`}
                        </text>
                        <text x={PANEL_X} y="230" fill={spotOn ? ACCENT : INK_STRUCTURE} fontSize="11" style={NUMERALS}>
                            {spotOn ? "spot on" : `${formatGap(gap)} away from the middle`}
                        </text>
                    </g>
                </>
            ) : (
                <g {...hoverProps("middle")} opacity={opacity("middle")} style={EASE_150}>
                    <rect x={PANEL_X - 8} y="72" width="190" height="100" fill="transparent" />
                    <text
                        x={PANEL_X}
                        y="92"
                        fill={isActive("middle") ? ACCENT : INK}
                        fontSize={isActive("middle") ? "16" : "14"}
                        style={EASE_150}
                    >
                        Where is the middle?
                    </text>
                    <text x={PANEL_X} y="122" fill={INK_STRUCTURE} fontSize="12">
                        Drop the hollow marker
                    </text>
                    <text x={PANEL_X} y="142" fill={INK_STRUCTURE} fontSize="12">
                        where you think it sits,
                    </text>
                    <text x={PANEL_X} y="162" fill={INK_STRUCTURE} fontSize="12">
                        then let go.
                    </text>
                </g>
            )}
        </svg>
    );
}

function MidpointFigure() {
    const setVar = useSetVar();
    return (
        <Figure
            id="midpoint-guess"
            onReset={() => {
                setVar("midpointPinAx", 1);
                setVar("midpointPinAy", 1);
                setVar("midpointPinBx", 6);
                setVar("midpointPinBy", 7);
                setVar("midpointGuessX", 4.5);
                setVar("midpointGuessY", 5);
                setVar("midpointRevealed", false);
                setVar("midpointHighlight", "");
            }}
            caption="Drop the hollow marker where you think the middle of the line sits, then let go. The true middle appears in teal, with the working beside it. Move either grey pin for a fresh try."
        >
            <MidpointDrawing />
            <InteractionHintSequence
                hintKey="midpoint-drop-guess"
                steps={[
                    {
                        gesture: "drag",
                        label: "Drop the hollow marker on the middle, then let go",
                        position: { x: "34%", y: "39%" },
                        dragPath: { type: "line", startOffset: { x: 18, y: -14 }, endOffset: { x: -18, y: 14 } },
                    },
                ]}
            />
        </Figure>
    );
}

// ── Live numbers used inside the prose ───────────────────────────────────────

function LiveSubtractedGap() {
    const { ax, bx } = useMidpointModel();
    return <span style={NUMERALS}>{`${bx} − ${ax} = ${bx - ax}`}</span>;
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
                Halfway between two numbers is simply their average: add them, then halve. Drop
                the{" "}
                <InlineLinkedHighlight
                    varName="midpointHighlight"
                    highlightId="guess"
                    {...linkedHighlightPropsFromDefinition(getVariableInfo("midpointHighlight"))}
                >
                    hollow marker
                </InlineLinkedHighlight>{" "}
                where you think that spot sits, let go, and the{" "}
                <InlineLinkedHighlight
                    varName="midpointHighlight"
                    highlightId="middle"
                    {...linkedHighlightPropsFromDefinition(getVariableInfo("midpointHighlight"))}
                >
                    true middle
                </InlineLinkedHighlight>{" "}
                appears next to your guess.
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
                    highlightId="middle"
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
                            midpointPinBx: 7,
                            midpointPinBy: 8,
                            midpointGuessX: 2,
                            midpointGuessY: 3,
                            midpointRevealed: false,
                        },
                        steps: [
                            {
                                gesture: "drag-horizontal",
                                label: "Slide the hollow marker across until it sits between the two pins",
                                position: { x: "21%", y: "55%" },
                                completionVar: "midpointGuessX",
                                completionValue: 4.5,
                                completionTolerance: 0.6,
                            },
                            {
                                gesture: "drag-vertical",
                                label: "Now lift it onto the line and let go — read the x working on the right",
                                position: { x: "34%", y: "45%" },
                                completionVar: "midpointGuessY",
                                completionValue: 5.5,
                                completionTolerance: 0.6,
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
                            midpointPinBy: 8,
                            midpointGuessX: 2,
                            midpointGuessY: 3,
                            midpointRevealed: false,
                        },
                        steps: [
                            {
                                gesture: "drag-horizontal",
                                label: "Drag the grey shop pin left until it sits above 7",
                                position: { x: "58%", y: "24%" },
                                completionVar: "midpointPinBx",
                                completionValue: 7,
                                completionTolerance: 0.4,
                            },
                            {
                                gesture: "drag",
                                label: "Drop the hollow marker on the middle and let go — compare 4.5 with 5",
                                position: { x: "21%", y: "55%" },
                                completionVar: "midpointGuessX",
                                completionValue: 4.5,
                                completionTolerance: 0.6,
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

import React, { useRef, useState, type ReactElement } from "react";
import { Block } from "@/components/templates";
import { StackLayout } from "@/components/layouts";
import {
    EditableH2,
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
// The grid fills the left half; the panel gutter on the right was reserved
// before the grid was sized, so no readout can run past the viewBox edge.

const VIEW_WIDTH = 560;
const VIEW_HEIGHT = 340;
const UNIT_PX = 22;
const GRID_MIN = -6;
const GRID_MAX = 6;
const ORIGIN_X = 182;
const ORIGIN_Y = 170;
const PANEL_X = 348;

/** Centre and radius are bounded so the circle always fits on the grid. */
const CENTRE_LIMIT = 3;
const RADIUS_MIN = 1;
const RADIUS_MAX = 3;

const INK = "#334155";
const INK_STRUCTURE = "#64748B";
const INK_QUIET = "#CBD5E1";
const ACCENT = "#62D0AD";

const EASE_150 = { transition: "opacity 150ms ease, stroke-width 150ms ease" } as const;
const NUMERALS = { fontVariantNumeric: "tabular-nums" } as const;

const toPixelX = (x: number) => ORIGIN_X + x * UNIT_PX;
const toPixelY = (y: number) => ORIGIN_Y - y * UNIT_PX;

/** One formatter per quantity, shared by the drawing and the prose. */
const formatSigned = (value: number) => `${value < 0 ? "−" : ""}${Math.abs(value)}`;
/** How the equation writes a bracket: it always SUBTRACTS the centre. */
const bracketFor = (letter: string, value: number) =>
    value === 0 ? `${letter}²` : `(${letter} ${value < 0 ? "+" : "−"} ${Math.abs(value)})²`;

const useCircleModel = () => {
    const centreX = useVar<number>("circleCentreX", -2);
    const centreY = useVar<number>("circleCentreY", 1);
    const radius = useVar<number>("circleRadius", 3);
    const beadAngle = useVar<number>("circleBeadAngle", 30);
    const radians = (beadAngle * Math.PI) / 180;
    return {
        centreX, centreY, radius, beadAngle,
        beadX: centreX + Math.cos(radians) * radius,
        beadY: centreY + Math.sin(radians) * radius,
    };
};

// ── Highlight channel shared by the drawing, the formula and the prose ───────

const useCircleHighlight = () => {
    const highlight = useVar<string>("circleHighlight", "");
    const setVar = useSetVar();
    const active = (id: string) => highlight === id;
    return {
        isActive: active,
        opacity: (id: string) => (highlight && !active(id) ? 0.35 : 1),
        weight: (id: string, resting: number) => (active(id) ? resting * 1.6 : resting),
        hoverProps: (id: string) => ({
            onPointerEnter: () => setVar("circleHighlight", id),
            onPointerLeave: () => setVar("circleHighlight", ""),
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

// ── The drawing ──────────────────────────────────────────────────────────────

function CircleEquationDrawing() {
    const svgRef = useRef<SVGSVGElement>(null);
    const setVar = useSetVar();
    const { centreX, centreY, radius, beadX, beadY } = useCircleModel();
    const { opacity, weight, isActive, hoverProps } = useCircleHighlight();

    const [draggingCentre, setDraggingCentre] = useState(false);
    const [draggingBead, setDraggingBead] = useState(false);
    const [hoveredCentre, setHoveredCentre] = useState(false);
    const [hoveredBead, setHoveredBead] = useState(false);
    // Refs, not state: a fast drag can deliver its first pointermove before a
    // state update has flushed, and the stale closure would swallow it.
    const centreRef = useRef(false);
    const beadRef = useRef(false);
    const centreScale = useSpring(draggingCentre || hoveredCentre ? 1.18 : 1, { stiffness: 400, damping: 26 });
    const beadScale = useSpring(draggingBead || hoveredBead ? 1.2 : 1, { stiffness: 400, damping: 26 });

    const moveCentre = (event: React.PointerEvent) => {
        if (!centreRef.current) return;
        const point = svgPointFromEvent(event, svgRef.current);
        setVar("circleCentreX", clamp(Math.round((point.x - ORIGIN_X) / UNIT_PX), -CENTRE_LIMIT, CENTRE_LIMIT));
        setVar("circleCentreY", clamp(Math.round((ORIGIN_Y - point.y) / UNIT_PX), -CENTRE_LIMIT, CENTRE_LIMIT));
    };

    const moveBead = (event: React.PointerEvent) => {
        if (!beadRef.current) return;
        const point = svgPointFromEvent(event, svgRef.current);
        const dx = (point.x - toPixelX(centreX)) / UNIT_PX;
        const dy = (toPixelY(centreY) - point.y) / UNIT_PX;
        const degrees = (Math.atan2(dy, dx) * 180) / Math.PI;
        setVar("circleBeadAngle", Math.round((degrees + 360) % 360));
        setVar("circleRadius", clamp(Math.round(Math.hypot(dx, dy)), RADIUS_MIN, RADIUS_MAX));
    };

    const centre: Vec2 = { x: toPixelX(centreX), y: toPixelY(centreY) };
    const bead: Vec2 = { x: toPixelX(beadX), y: toPixelY(beadY) };
    const signNote =
        centreX === 0
            ? "x − 0 is written just x"
            : centreX < 0
                ? `x − (${formatSigned(centreX)}) is written x + ${Math.abs(centreX)}`
                : `the bracket subtracts ${centreX}`;

    return (
        <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            className="block w-full select-none"
            role="img"
            aria-label="A circle on a grid with a draggable centre pin and a draggable bead on the rim, beside its equation"
        >
            <defs>
                <filter id="circle-handle-shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#0F172A" floodOpacity="0.25" />
                </filter>
            </defs>

            {/* Grid and axis numbers — ambient structure, always quiet. */}
            <g opacity={opacity("__structure")} style={EASE_150}>
                {Array.from({ length: GRID_MAX - GRID_MIN + 1 }, (_, i) => GRID_MIN + i).map((v) => (
                    <line key={`grid-x-${v}`} x1={toPixelX(v)} y1={toPixelY(GRID_MIN)} x2={toPixelX(v)} y2={toPixelY(GRID_MAX)} stroke={INK_QUIET} strokeWidth="1" />
                ))}
                {Array.from({ length: GRID_MAX - GRID_MIN + 1 }, (_, i) => GRID_MIN + i).map((v) => (
                    <line key={`grid-y-${v}`} x1={toPixelX(GRID_MIN)} y1={toPixelY(v)} x2={toPixelX(GRID_MAX)} y2={toPixelY(v)} stroke={INK_QUIET} strokeWidth="1" />
                ))}
                <line x1={toPixelX(GRID_MIN)} y1={toPixelY(0)} x2={toPixelX(GRID_MAX)} y2={toPixelY(0)} stroke={INK_STRUCTURE} strokeWidth="1.5" />
                <line x1={toPixelX(0)} y1={toPixelY(GRID_MIN)} x2={toPixelX(0)} y2={toPixelY(GRID_MAX)} stroke={INK_STRUCTURE} strokeWidth="1.5" />
                <g fill={INK} fontSize="11" style={NUMERALS}>
                    {[-6, -3, 3, 6].map((v) => (
                        <text key={`label-x-${v}`} x={toPixelX(v)} y={toPixelY(0) + 16} textAnchor="middle">
                            {formatSigned(v)}
                        </text>
                    ))}
                    {[-6, -3, 3, 6].map((v) => (
                        <text key={`label-y-${v}`} x={toPixelX(0) - 8} y={toPixelY(v) + 4} textAnchor="end">
                            {formatSigned(v)}
                        </text>
                    ))}
                </g>
            </g>

            {/* RADIUS — the circle, the spoke and the bead, in the one accent hue. */}
            <g {...hoverProps("radius")} opacity={opacity("radius")} style={EASE_150}>
                <Halo active={isActive("radius")}>
                    <circle cx={centre.x} cy={centre.y} r={radius * UNIT_PX} fill="none" stroke={ACCENT} strokeWidth={weight("radius", 2.5) + 6} />
                </Halo>
                <circle cx={centre.x} cy={centre.y} r={radius * UNIT_PX} fill={ACCENT} fillOpacity={isActive("radius") ? 0.12 : 0.05} stroke={ACCENT} strokeWidth={weight("radius", 2.5)} style={EASE_150} />
                <line x1={centre.x} y1={centre.y} x2={bead.x} y2={bead.y} stroke={ACCENT} strokeWidth={weight("radius", 2)} strokeLinecap="round" />
                <g transform={`translate(${bead.x} ${bead.y}) scale(${beadScale})`}>
                    <circle r="8" fill={ACCENT} filter="url(#circle-handle-shadow)" />
                </g>
                <circle
                    cx={bead.x}
                    cy={bead.y}
                    r="22"
                    fill="transparent"
                    style={{ cursor: draggingBead ? "grabbing" : "grab", touchAction: "none" }}
                    onPointerDown={(event) => {
                        event.currentTarget.setPointerCapture(event.pointerId);
                        beadRef.current = true;
                        setDraggingBead(true);
                    }}
                    onPointerMove={moveBead}
                    onPointerUp={() => { beadRef.current = false; setDraggingBead(false); }}
                    onPointerCancel={() => { beadRef.current = false; setDraggingBead(false); }}
                    onPointerEnter={() => setHoveredBead(true)}
                    onPointerLeave={() => setHoveredBead(false)}
                />
            </g>

            {/* CENTRE — the pin the whole circle hangs from. */}
            <g {...hoverProps("centre")} opacity={opacity("centre")} style={EASE_150}>
                <Halo active={isActive("centre")}>
                    <circle cx={centre.x} cy={centre.y} r="7" fill="none" stroke={INK_STRUCTURE} strokeWidth="12" />
                </Halo>
                <g transform={`translate(${centre.x} ${centre.y}) scale(${centreScale})`}>
                    <circle r="7" fill={INK_STRUCTURE} filter="url(#circle-handle-shadow)" />
                </g>
                <circle
                    cx={centre.x}
                    cy={centre.y}
                    r="20"
                    fill="transparent"
                    style={{ cursor: draggingCentre ? "grabbing" : "grab", touchAction: "none" }}
                    onPointerDown={(event) => {
                        event.currentTarget.setPointerCapture(event.pointerId);
                        centreRef.current = true;
                        setDraggingCentre(true);
                    }}
                    onPointerMove={moveCentre}
                    onPointerUp={() => { centreRef.current = false; setDraggingCentre(false); }}
                    onPointerCancel={() => { centreRef.current = false; setDraggingCentre(false); }}
                    onPointerEnter={() => setHoveredCentre(true)}
                    onPointerLeave={() => setHoveredCentre(false)}
                />
            </g>

            {/* The panel. The equation is the longest string at ~179 units, so
                every line ends well inside the 536 right-hand limit. */}
            <g {...hoverProps("centre")} opacity={opacity("centre")} style={EASE_150}>
                <rect x={PANEL_X - 8} y="46" width="190" height="46" fill="transparent" />
                <text x={PANEL_X} y="60" fill={INK_STRUCTURE} fontSize="11">
                    centre
                </text>
                <text x={PANEL_X} y="84" fill={INK} fontSize="14" style={NUMERALS}>
                    {`(${formatSigned(centreX)}, ${formatSigned(centreY)})`}
                </text>
            </g>

            <g {...hoverProps("radius")} opacity={opacity("radius")} style={EASE_150}>
                <rect x={PANEL_X - 8} y="100" width="190" height="46" fill="transparent" />
                <text x={PANEL_X} y="114" fill={INK_STRUCTURE} fontSize="11">
                    radius
                </text>
                <text x={PANEL_X} y="138" fill={ACCENT} fontSize="14" style={NUMERALS}>
                    {`r = ${radius}`}
                </text>
            </g>

            <g opacity={opacity("__structure")} style={EASE_150}>
                <text x={PANEL_X} y="176" fill={INK_STRUCTURE} fontSize="11">
                    equation
                </text>
                <text x={PANEL_X} y="202" fill={INK} fontSize="13" style={NUMERALS}>
                    {`${bracketFor("x", centreX)} + ${bracketFor("y", centreY)} = ${radius * radius}`}
                </text>
            </g>

            <g {...hoverProps("radius")} opacity={opacity("radius")} style={EASE_150}>
                <rect x={PANEL_X - 8} y="216" width="190" height="52" fill="transparent" />
                <text x={PANEL_X} y="236" fill={ACCENT} fontSize="14" style={NUMERALS}>
                    {`r² = ${radius}² = ${radius * radius}`}
                </text>
                <text x={PANEL_X} y="258" fill={INK_STRUCTURE} fontSize="11" style={NUMERALS}>
                    {`so the radius is ${radius}, not ${radius * radius}`}
                </text>
            </g>

            <g {...hoverProps("centre")} opacity={opacity("centre")} style={EASE_150}>
                <rect x={PANEL_X - 8} y="278" width="190" height="34" fill="transparent" />
                <text x={PANEL_X} y="298" fill={INK_STRUCTURE} fontSize="11" style={NUMERALS}>
                    {signNote}
                </text>
            </g>
        </svg>
    );
}

function CircleEquationFigure() {
    const setVar = useSetVar();
    return (
        <Figure
            id="circle-equation"
            onReset={() => {
                setVar("circleCentreX", -2);
                setVar("circleCentreY", 1);
                setVar("circleRadius", 3);
                setVar("circleBeadAngle", 30);
                setVar("circleHighlight", "");
            }}
            caption="Drag the grey centre pin to move the whole circle, or pull the teal bead in and out to resize it. The equation beside the grid rewrites itself every time."
        >
            <CircleEquationDrawing />
            <InteractionHintSequence
                hintKey="circle-equation-drag-bead"
                steps={[
                    {
                        gesture: "drag",
                        label: "Pull the teal bead in or out",
                        position: { x: "42%", y: "31%" },
                        dragPath: { type: "line", startOffset: { x: -20, y: 12 }, endOffset: { x: 20, y: -12 } },
                    },
                ]}
            />
        </Figure>
    );
}

// ── Live numbers used inside the prose ───────────────────────────────────────

function LiveCircleEquation() {
    const { centreX, centreY, radius } = useCircleModel();
    return (
        <span style={{ ...NUMERALS, color: ACCENT, fontWeight: 600 }}>
            {`${bracketFor("x", centreX)} + ${bracketFor("y", centreY)} = ${radius * radius}`}
        </span>
    );
}

export const circlesOnTheGridBlocks: ReactElement[] = [
    <StackLayout key="layout-part-circles-heading" maxWidth="xl">
        <Block id="part-circles-heading" padding="md">
            <EditableH2 id="h2-part-circles-heading" blockId="part-circles-heading">
                Part 3 · Circles
            </EditableH2>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-circles-setup" maxWidth="xl">
        <Block id="circles-setup" padding="sm">
            <EditableParagraph id="para-circles-setup" blockId="circles-setup">
                A circle is nothing more than every point sitting the same distance from one
                centre. That is the distance formula again, with the distance held fixed at r.
                Drag the grey{" "}
                <InlineLinkedHighlight
                    varName="circleHighlight"
                    highlightId="centre"
                    {...linkedHighlightPropsFromDefinition(getVariableInfo("circleHighlight"))}
                >
                    centre pin
                </InlineLinkedHighlight>{" "}
                to move the whole circle, or pull the teal bead on the rim in and out, and the
                equation becomes <LiveCircleEquation />.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-circles-figure" maxWidth="xl">
        <Block id="circles-figure" padding="sm" hasVisualization>
            <CircleEquationFigure />
        </Block>
    </StackLayout>,

    <StackLayout key="layout-circles-formula" maxWidth="xl">
        <Block id="circles-formula" padding="lg">
            <FormulaBlock
                latex="(x - \highlight{centre}{a})^2 + (y - \highlight{centre}{b})^2 = \highlight{radius}{r}^2"
                linkedHighlights={{
                    centre: { varName: "circleHighlight", color: ACCENT, bgColor: "rgba(98, 208, 173, 0.22)" },
                    radius: { varName: "circleHighlight", color: ACCENT, bgColor: "rgba(98, 208, 173, 0.22)" },
                }}
            />
        </Block>
    </StackLayout>,

    <StackLayout key="layout-circles-worked-example" maxWidth="xl">
        <Block id="circles-worked-example" padding="sm">
            <EditableParagraph id="para-circles-worked-example" blockId="circles-worked-example">
                Squaring both sides clears the square root and leaves the equation of a circle,
                with centre (a, b) and{" "}
                <InlineLinkedHighlight
                    varName="circleHighlight"
                    highlightId="radius"
                    {...linkedHighlightPropsFromDefinition(getVariableInfo("circleHighlight"))}
                >
                    radius
                </InlineLinkedHighlight>{" "}
                r. Watch the number on the right: it is r squared, so the radius is its square
                root. A plus sign inside the brackets means a negative coordinate, because y + 2
                is really y − (−2).
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-circles-question-radius" maxWidth="xl">
        <Block id="circles-question-radius" padding="md">
            <EditableParagraph id="para-circles-question-radius" blockId="circles-question-radius">
                A different circle has equation (x − 4)² + (y − 1)² = 36. Its radius is{" "}
                <InlineFeedback
                    varName="answerCircleRadius"
                    correctValue="6"
                    position="terminal"
                    successMessage="— exactly, 36 is the radius squared, and the square root of 36 is 6"
                    failureMessage="— not quite."
                    hint="the number on the right is always r squared, so it needs rooting before it becomes a radius"
                    visualizationHint={{
                        blockId: "circles-figure",
                        hintKey: "circles-question-radius-hint",
                        label: "Discover it yourself",
                        resetVars: { circleCentreX: 0, circleCentreY: 0, circleRadius: 1, circleBeadAngle: 30 },
                        steps: [
                            {
                                gesture: "drag",
                                label: "Pull the teal bead out until the radius reads 3 — the right-hand number becomes 9",
                                position: { x: "36%", y: "40%" },
                                completionVar: "circleRadius",
                                completionValue: 3,
                                completionTolerance: 0.4,
                            },
                            {
                                gesture: "drag",
                                label: "Push it back in to 2 — the right-hand number drops to 4, not 2",
                                position: { x: "42%", y: "34%" },
                                completionVar: "circleRadius",
                                completionValue: 2,
                                completionTolerance: 0.4,
                            },
                        ],
                    }}
                >
                    <InlineClozeInput
                        varName="answerCircleRadius"
                        correctAnswer="6"
                        {...clozePropsFromDefinition(getVariableInfo("answerCircleRadius"))}
                    />
                </InlineFeedback>.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-circles-question-centre" maxWidth="xl">
        <Block id="circles-question-centre" padding="md">
            <EditableParagraph id="para-circles-question-centre" blockId="circles-question-centre">
                Now look at (x − 4)² + (y + 1)² = 36, where the second bracket has a plus sign in
                it. The centre of that circle is{" "}
                <InlineFeedback
                    varName="answerCircleCentre"
                    correctValue="(4, −1)"
                    position="terminal"
                    successMessage="— right, y + 1 is really y − (−1), so the second coordinate comes out negative"
                    failureMessage="— have another look."
                    hint="the equation always subtracts the centre, so rewrite the plus as a subtraction first"
                    visualizationHint={{
                        blockId: "circles-figure",
                        hintKey: "circles-question-centre-hint",
                        label: "Discover it yourself",
                        resetVars: { circleCentreX: 0, circleCentreY: 0, circleRadius: 2, circleBeadAngle: 30 },
                        steps: [
                            {
                                gesture: "drag-vertical",
                                label: "Drag the grey centre pin down to −1 and watch the second bracket",
                                position: { x: "32%", y: "44%" },
                                completionVar: "circleCentreY",
                                completionValue: -1,
                                completionTolerance: 0.4,
                            },
                            {
                                gesture: "drag-horizontal",
                                label: "Now drag it right to 3 — one bracket subtracts, the other adds",
                                position: { x: "32%", y: "50%" },
                                completionVar: "circleCentreX",
                                completionValue: 3,
                                completionTolerance: 0.4,
                            },
                        ],
                    }}
                >
                    <InlineClozeChoice
                        varName="answerCircleCentre"
                        correctAnswer="(4, −1)"
                        options={["(4, −1)", "(−4, 1)", "(4, 1)"]}
                        {...choicePropsFromDefinition(getVariableInfo("answerCircleCentre"))}
                    />
                </InlineFeedback>.
            </EditableParagraph>
        </Block>
    </StackLayout>,
];

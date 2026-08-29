import React, { useRef, type ReactElement } from "react";
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
import { clamp, type Vec2 } from "@/lib/motion";
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
const UNIT_PX = 26;
const ORIGIN_X = 50;
const ORIGIN_Y = 300;
const GRID_MAX = 10;
const PANEL_X = 348;

const CENTRE_X = 5;
const CENTRE_Y = 5;
const RADIUS = 5;
/** The whole-square points exactly 5 away: (0,±5), (±5,0), (±3,±4), (±4,±3). */
const TARGET_COUNT = 12;

const INK = "#334155";
const INK_STRUCTURE = "#64748B";
const INK_QUIET = "#CBD5E1";
const ACCENT = "#62D0AD";

const EASE_150 = { transition: "opacity 150ms ease, stroke-width 150ms ease" } as const;
const NUMERALS = { fontVariantNumeric: "tabular-nums" } as const;

const toPixelX = (x: number) => ORIGIN_X + x * UNIT_PX;
const toPixelY = (y: number) => ORIGIN_Y - y * UNIT_PX;

/** One formatter for distance, used by the drawing and by the prose. */
const formatDistance = (value: number) => value.toFixed(2);

const distanceFromCentre = (x: number, y: number) =>
    Math.hypot(x - CENTRE_X, y - CENTRE_Y);
const isOnCircle = (x: number, y: number) =>
    (x - CENTRE_X) ** 2 + (y - CENTRE_Y) ** 2 === RADIUS * RADIUS;

const useCircleModel = () => {
    const flat = useVar<number[]>("circlePoints", []);
    const lastX = useVar<number>("circleLastX", -1);
    const lastY = useVar<number>("circleLastY", -1);
    const points: Array<[number, number]> = [];
    for (let i = 0; i + 1 < flat.length; i += 2) points.push([flat[i], flat[i + 1]]);
    return {
        flat,
        points,
        lastX,
        lastY,
        hasLast: lastX >= 0 && lastY >= 0,
        found: points.filter(([x, y]) => isOnCircle(x, y)).length,
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

function CircleHuntDrawing() {
    const svgRef = useRef<SVGSVGElement>(null);
    const setVar = useSetVar();
    const { flat, points, lastX, lastY, hasLast, found } = useCircleModel();
    const { opacity, weight, isActive, hoverProps } = useCircleHighlight();

    const handleTap = (event: React.PointerEvent) => {
        const point = svgPointFromEvent(event, svgRef.current);
        const gx = clamp(Math.round((point.x - ORIGIN_X) / UNIT_PX), 0, GRID_MAX);
        const gy = clamp(Math.round((ORIGIN_Y - point.y) / UNIT_PX), 0, GRID_MAX);
        setVar("circleLastX", gx);
        setVar("circleLastY", gy);
        const already = points.some(([x, y]) => x === gx && y === gy);
        if (!already) setVar("circlePoints", [...flat, gx, gy]);
    };

    const lastDistance = hasLast ? distanceFromCentre(lastX, lastY) : 0;
    const lastOnCircle = hasLast && isOnCircle(lastX, lastY);
    // The ring emerges as the teal points accumulate — the before-state is
    // always visible, so progress reads as a shape appearing, not a jump.
    const ringOpacity = 0.12 + 0.8 * (found / TARGET_COUNT);

    return (
        <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            className="block w-full select-none"
            role="img"
            aria-label="A grid with a centre pin where tapped points exactly five away turn teal and trace out a ring"
        >
            <defs>
                <filter id="circle-pin-shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#0F172A" floodOpacity="0.25" />
                </filter>
            </defs>

            {/* Grid and axis numbers — ambient structure, always quiet. */}
            <g opacity={opacity("__structure")} style={EASE_150}>
                {Array.from({ length: GRID_MAX + 1 }, (_, i) => (
                    <line key={`grid-x-${i}`} x1={toPixelX(i)} y1={toPixelY(0)} x2={toPixelX(i)} y2={toPixelY(GRID_MAX)} stroke={INK_QUIET} strokeWidth="1" />
                ))}
                {Array.from({ length: GRID_MAX + 1 }, (_, i) => (
                    <line key={`grid-y-${i}`} x1={toPixelX(0)} y1={toPixelY(i)} x2={toPixelX(GRID_MAX)} y2={toPixelY(i)} stroke={INK_QUIET} strokeWidth="1" />
                ))}
                <line x1={toPixelX(0)} y1={toPixelY(0)} x2={toPixelX(GRID_MAX)} y2={toPixelY(0)} stroke={INK_STRUCTURE} strokeWidth="1.5" />
                <line x1={toPixelX(0)} y1={toPixelY(0)} x2={toPixelX(0)} y2={toPixelY(GRID_MAX)} stroke={INK_STRUCTURE} strokeWidth="1.5" />
                <g fill={INK} fontSize="11" style={NUMERALS}>
                    {[0, 2, 4, 6, 8, 10].map((i) => (
                        <text key={`label-x-${i}`} x={toPixelX(i)} y={toPixelY(0) + 18} textAnchor="middle">{i}</text>
                    ))}
                    {[2, 4, 6, 8, 10].map((i) => (
                        <text key={`label-y-${i}`} x={ORIGIN_X - 10} y={toPixelY(i) + 4} textAnchor="end">{i}</text>
                    ))}
                </g>
            </g>

            {/* The tap surface sits UNDER the drawn marks, so hovering a point
                or the centre pin still reaches its linked highlight. */}
            <rect
                x={toPixelX(0) - 13}
                y={toPixelY(GRID_MAX) - 13}
                width={GRID_MAX * UNIT_PX + 26}
                height={GRID_MAX * UNIT_PX + 26}
                fill="transparent"
                style={{ cursor: "crosshair", touchAction: "none" }}
                onPointerDown={handleTap}
            />

            {/* The ring the teal points are tracing out. */}
            <g {...hoverProps("found")} opacity={opacity("found")} style={EASE_150} onPointerDown={handleTap}>
                <circle
                    cx={toPixelX(CENTRE_X)}
                    cy={toPixelY(CENTRE_Y)}
                    r={RADIUS * UNIT_PX}
                    fill="none"
                    stroke={ACCENT}
                    strokeWidth={weight("found", 2.5)}
                    opacity={ringOpacity}
                    style={EASE_150}
                />
            </g>

            {/* Every point the student has tapped: teal if it belongs, grey if not. */}
            <g {...hoverProps("found")} opacity={opacity("found")} style={EASE_150} onPointerDown={handleTap}>
                {points.map(([x, y]) => {
                    const belongs = isOnCircle(x, y);
                    return (
                        <circle
                            key={`tap-${x}-${y}`}
                            cx={toPixelX(x)}
                            cy={toPixelY(y)}
                            r={belongs ? 6 : 3.5}
                            fill={belongs ? ACCENT : INK_QUIET}
                            opacity={belongs ? 1 : 0.75}
                        />
                    );
                })}
            </g>

            {/* The spoke out to the last tap — the distance being tested. */}
            {hasLast && (
                <g {...hoverProps("radius")} opacity={opacity("radius")} style={EASE_150}>
                    <Halo active={isActive("radius")}>
                        <line x1={toPixelX(CENTRE_X)} y1={toPixelY(CENTRE_Y)} x2={toPixelX(lastX)} y2={toPixelY(lastY)} stroke={lastOnCircle ? ACCENT : INK_STRUCTURE} strokeWidth={weight("radius", 2) + 6} strokeLinecap="round" />
                    </Halo>
                    <line
                        x1={toPixelX(CENTRE_X)}
                        y1={toPixelY(CENTRE_Y)}
                        x2={toPixelX(lastX)}
                        y2={toPixelY(lastY)}
                        stroke={lastOnCircle ? ACCENT : INK_STRUCTURE}
                        strokeWidth={weight("radius", 2)}
                        strokeDasharray={lastOnCircle ? undefined : "4 4"}
                        strokeLinecap="round"
                    />
                </g>
            )}

            {/* The centre pin. */}
            <g {...hoverProps("centre")} opacity={opacity("centre")} style={EASE_150}>
                <Halo active={isActive("centre")}>
                    <circle cx={toPixelX(CENTRE_X)} cy={toPixelY(CENTRE_Y)} r="7" fill="none" stroke={INK_STRUCTURE} strokeWidth="12" />
                </Halo>
                <circle cx={toPixelX(CENTRE_X)} cy={toPixelY(CENTRE_Y)} r={isActive("centre") ? 9 : 7} fill={INK_STRUCTURE} filter="url(#circle-pin-shadow)" style={EASE_150} />
            </g>

            {/* The panel. Longest string here is the equation at ~156 units, so
                every readout ends well inside the 536 right-hand limit. */}
            <g {...hoverProps("centre")} opacity={opacity("centre")} style={EASE_150}>
                <rect x={PANEL_X - 8} y="46" width="190" height="26" fill="transparent" />
                <text x={PANEL_X} y="64" fill={INK} fontSize="12" style={NUMERALS}>
                    {`centre (${CENTRE_X}, ${CENTRE_Y})`}
                </text>
            </g>
            <g {...hoverProps("radius")} opacity={opacity("radius")} style={EASE_150}>
                <rect x={PANEL_X - 8} y="74" width="190" height="26" fill="transparent" />
                <text x={PANEL_X} y="92" fill={INK} fontSize="12" style={NUMERALS}>
                    {`radius ${RADIUS}`}
                </text>
            </g>

            <g {...hoverProps("found")} opacity={opacity("found")} style={EASE_150}>
                <rect x={PANEL_X - 8} y="118" width="190" height="30" fill="transparent" />
                <text x={PANEL_X} y="140" fill={found === TARGET_COUNT ? ACCENT : INK} fontSize="15" style={NUMERALS}>
                    {`found ${found} of ${TARGET_COUNT}`}
                </text>
            </g>

            {hasLast ? (
                <g {...hoverProps("radius")} opacity={opacity("radius")} style={EASE_150}>
                    <rect x={PANEL_X - 8} y="168" width="190" height="56" fill="transparent" />
                    <text x={PANEL_X} y="188" fill={INK_STRUCTURE} fontSize="11">
                        your last tap
                    </text>
                    <text x={PANEL_X} y="208" fill={INK} fontSize="12" style={NUMERALS}>
                        {`(${lastX}, ${lastY}) is ${formatDistance(lastDistance)} away`}
                    </text>
                    <text x={PANEL_X} y="228" fill={lastOnCircle ? ACCENT : INK_STRUCTURE} fontSize="11" style={NUMERALS}>
                        {lastOnCircle ? "5 away, on the circle" : "not 5 away, off the circle"}
                    </text>
                </g>
            ) : (
                <g opacity={opacity("__structure")} style={EASE_150}>
                    <text x={PANEL_X} y="188" fill={INK_STRUCTURE} fontSize="12">
                        Tap anywhere on the grid
                    </text>
                    <text x={PANEL_X} y="208" fill={INK_STRUCTURE} fontSize="12">
                        to test a point.
                    </text>
                </g>
            )}

            <g {...hoverProps("found")} opacity={opacity("found")} style={EASE_150}>
                <rect x={PANEL_X - 8} y="250" width="200" height="46" fill="transparent" />
                <text x={PANEL_X} y="272" fill={ACCENT} fontSize="13" style={NUMERALS}>
                    (x−5)² + (y−5)² = 25
                </text>
                <text x={PANEL_X} y="292" fill={INK_STRUCTURE} fontSize="11">
                    every teal point fits this
                </text>
            </g>
        </svg>
    );
}

function CircleHuntFigure() {
    const setVar = useSetVar();
    return (
        <Figure
            id="circle-hunt"
            onReset={() => {
                setVar("circlePoints", []);
                setVar("circleLastX", -1);
                setVar("circleLastY", -1);
                setVar("circleHighlight", "");
            }}
            caption="Tap anywhere on the grid. Points exactly 5 from the centre pin turn teal and stay; the rest fade to grey. There are 12 of them, and the ring sharpens as you find them."
        >
            <CircleHuntDrawing />
            <InteractionHintSequence
                hintKey="circle-hunt-tap"
                steps={[
                    {
                        gesture: "click",
                        label: "Tap a point you think is exactly 5 from the centre",
                        position: { x: "40%", y: "34%" },
                    },
                ]}
            />
        </Figure>
    );
}

// ── Live numbers used inside the prose ───────────────────────────────────────

function LiveFoundCount() {
    const { found } = useCircleModel();
    return (
        <span style={{ ...NUMERALS, color: ACCENT, fontWeight: 600 }}>
            {`${found} of ${TARGET_COUNT}`}
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
                Tap around the grid and hunt for every point exactly 5 from the{" "}
                <InlineLinkedHighlight
                    varName="circleHighlight"
                    highlightId="centre"
                    {...linkedHighlightPropsFromDefinition(getVariableInfo("circleHighlight"))}
                >
                    centre pin
                </InlineLinkedHighlight>
                : so far you have <LiveFoundCount />.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-circles-figure" maxWidth="xl">
        <Block id="circles-figure" padding="sm" hasVisualization>
            <CircleHuntFigure />
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
                r. Watch the number on the right: 25 is r squared, so the radius is its square
                root, 5, and not 25. A plus sign inside the brackets means a negative coordinate,
                because y + 2 is really y − (−2).
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
                        resetVars: { circleLastX: -1, circleLastY: -1 },
                        steps: [
                            {
                                gesture: "click",
                                label: "Tap the point 5 squares directly right of the centre pin",
                                position: { x: "50%", y: "45%" },
                                completionVar: "circleLastX",
                                completionValue: 10,
                                completionTolerance: 0.4,
                            },
                            {
                                gesture: "click",
                                label: "Now tap 3 right and 4 up from the centre — same distance, and 25 sits on the right of the equation",
                                position: { x: "45%", y: "28%" },
                                completionVar: "circleLastY",
                                completionValue: 9,
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
                    reviewBlockId="circles-worked-example"
                    reviewLabel="Review how the signs work"
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

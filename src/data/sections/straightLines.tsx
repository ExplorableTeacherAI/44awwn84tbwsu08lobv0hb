import { type ReactElement } from "react";
import { Block } from "@/components/templates";
import { StackLayout } from "@/components/layouts";
import { EditableH2, EditableParagraph } from "@/components/atoms";
import { FormulaBlock } from "@/components/molecules";
import { VisualOptionCards } from "@/components/organisms";

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
                by the same amount every single time, and that fixed climb is called the gradient,
                written m. The height at which it crosses the y-axis is the second number you
                need, written c.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-straight-lines-formula" maxWidth="xl">
        <Block id="straight-lines-formula" padding="lg">
            <FormulaBlock latex="y = mx + c" />
        </Block>
    </StackLayout>,

    <Block key="layout-straight-lines-visual" id="straight-lines-visual">
        <VisualOptionCards
            blockId="straight-lines-visual"
            cards={[
                {
                    id: "straight-lines-staircase",
                    title: "A line across a grid with a staircase of one-right steps drawn along it",
                    looks: "Imagine a line running across a grid, with a handle at each end. Along the line sits a little staircase: each tread goes one square right, then climbs to meet the line again. Beside the grid the equation is written out, and its two numbers change as the line moves.",
                    manipulate: "Drag one handle to tilt the line and the other to slide it up or down, and watch the stairs grow taller or flatter",
                    reveals: "The climb of every step is the same number that appears in front of the x, and sliding the line up or down changes only the number added at the end.",
                    paradigm: "conventional",
                    recommended: true,
                    secondView: {
                        shows: "The equation y = mx + c with its gradient and intercept updating live as the line moves",
                        role: "constructing",
                        syncedBy: "lineGradient and lineIntercept, plus a shared hover highlight tying the staircase to m and the axis crossing to c",
                    },
                },
                {
                    id: "straight-lines-build-from-dots",
                    title: "An empty grid where dots students place snap into a straight line",
                    looks: "Imagine a bare grid. Every tap leaves a dot behind, and as soon as two dots exist a line is drawn through them. Dots placed off that line glow amber and refuse to join in, while dots that fit turn teal and the line extends to the edges of the grid.",
                    manipulate: "Tap out a run of dots that all sit on one straight line, keeping the same right-and-up step each time",
                    reveals: "A line is just a rule about the step, so any dot that breaks the step cannot belong to the line.",
                    paradigm: "constructivist",
                },
                {
                    id: "straight-lines-match-the-mystery",
                    title: "A faint mystery line on a grid with a teal line students steer on top of it",
                    looks: "Imagine a faint grey line crossing a grid, with a teal line of the student's own laid over it. A small badge shows how closely the two match, turning green only once the teal line lies exactly on the grey one along its whole length.",
                    manipulate: "Tilt and slide the teal line until it covers the grey one completely, then read off the two numbers it ended up with",
                    reveals: "Two numbers, the climb per step and the crossing height, pin down a straight line completely, with nothing left over to choose.",
                    paradigm: "goal",
                },
            ]}
        />
    </Block>,

    <StackLayout key="layout-straight-lines-worked-example" maxWidth="xl">
        <Block id="straight-lines-worked-example" padding="sm">
            <EditableParagraph id="para-straight-lines-worked-example" blockId="straight-lines-worked-example">
                Once you have m and c you can find the height of the line above any x you like.
                Take y = 2x + 1: going one step right always climbs 2, and the line sets off from
                1 on the y-axis. So at x = 4 the height is 2 × 4 + 1 = 9, and the point (4, 9) is
                on the line.
            </EditableParagraph>
        </Block>
    </StackLayout>,
];

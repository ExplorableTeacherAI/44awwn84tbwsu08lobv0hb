import { type ReactElement } from "react";
import { Block } from "@/components/templates";
import { StackLayout } from "@/components/layouts";
import { EditableH2, EditableParagraph } from "@/components/atoms";
import { FormulaBlock } from "@/components/molecules";
import { VisualOptionCards } from "@/components/organisms";

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
                A circle is nothing more than every point sitting the same distance from one centre.
                That is the distance formula all over again, only with the distance held fixed at r.
                Square both sides to clear away the square root and the equation of a circle falls
                out.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-circles-formula" maxWidth="xl">
        <Block id="circles-formula" padding="lg">
            <FormulaBlock latex="(x - a)^2 + (y - b)^2 = r^2" />
        </Block>
    </StackLayout>,

    <Block key="layout-circles-visual" id="circles-visual">
        <VisualOptionCards
            blockId="circles-visual"
            cards={[
                {
                    id: "circles-build-from-points",
                    title: "A grid with one centre pin, where points exactly five away turn teal and trace out a ring",
                    looks: "Imagine a single pin near the middle of a grid. Every tap leaves a dot with its distance from the pin written beside it. Dots that are exactly five away turn teal and stay put; the rest fade to grey, until the teal ones curve round into a full ring.",
                    manipulate: "Tap around the grid hunting for every point that sits exactly five away from the centre pin",
                    reveals: "A circle is not a shape you draw, it is the collection of all points at one fixed distance from a centre.",
                    paradigm: "constructivist",
                    recommended: true,
                },
                {
                    id: "circles-drag-centre-and-rim",
                    title: "A circle on a grid with a draggable centre pin and a draggable point on its rim",
                    looks: "Imagine a circle sitting on a grid with a pin at its centre and a bead on its rim, joined by a straight spoke. Beneath the grid the circle's equation is written out, and its three numbers rewrite themselves as the pin and the bead move.",
                    manipulate: "Drag the centre pin to move the whole circle, and drag the rim bead in or out to stretch it",
                    reveals: "The centre's coordinates appear inside the brackets with their signs flipped, and the number on the right is the radius squared, not the radius.",
                    targetsMisconception: "Students read the number on the right of the equation as the radius instead of r squared",
                    paradigm: "conventional",
                    secondView: {
                        shows: "The equation (x − a)² + (y − b)² = r² with a, b and r updating live",
                        role: "constructing",
                        syncedBy: "circleCentre and circleRadius, plus a shared hover highlight tying the spoke to r² and the centre pin to the bracketed terms",
                    },
                },
                {
                    id: "circles-match-the-equation",
                    title: "A written circle equation above an empty grid where students place the circle it describes",
                    looks: "Imagine an equation printed above a bare grid, with a loose circle below it that starts off in the wrong place and the wrong size. A tick appears beside the equation only once the circle sits exactly where the equation says it should.",
                    manipulate: "Drag the loose circle's centre and stretch its rim until it matches the printed equation",
                    reveals: "A minus sign in the brackets means a positive coordinate, a plus sign means a negative one, and the radius is the square root of the right-hand number.",
                    targetsMisconception: "Students read the number on the right of the equation as the radius instead of r squared",
                    paradigm: "inversion",
                },
            ]}
        />
    </Block>,

    <StackLayout key="layout-circles-worked-example" maxWidth="xl">
        <Block id="circles-worked-example" padding="sm">
            <EditableParagraph id="para-circles-worked-example" blockId="circles-worked-example">
                In that equation the centre is (a, b) and the radius is r. So the circle
                (x − 3)² + (y + 2)² = 25 has its centre at (3, −2), because y + 2 is really
                y − (−2). And 25 is r squared, so the radius is its square root, 5.
            </EditableParagraph>
        </Block>
    </StackLayout>,
];

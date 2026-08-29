import { type ReactElement } from "react";
import { Block } from "@/components/templates";
import { StackLayout } from "@/components/layouts";
import { EditableH2, EditableH3, EditableParagraph } from "@/components/atoms";
import { FormulaBlock } from "@/components/molecules";
import { VisualOptionCards } from "@/components/organisms";

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
            <EditableParagraph id="para-distance-setup" blockId="distance-setup">
                Two pins on a map are hardly ever straight across or straight up from each other,
                so counting squares will not do it. Here is the trick that rescues us: travel
                across, then travel up, and those two moves build a right-angled triangle with
                the two pins sitting at the ends of the slope.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-distance-formula" maxWidth="xl">
        <Block id="distance-formula" padding="lg">
            <FormulaBlock latex="d = \sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}" />
        </Block>
    </StackLayout>,

    <Block key="layout-distance-visual" id="distance-visual">
        <VisualOptionCards
            blockId="distance-visual"
            cards={[
                {
                    id: "distance-triangle-with-working",
                    title: "Two map pins on a grid with a right-angled triangle drawn under the slope",
                    looks: "Imagine a street grid with a pin at a cafe and a pin at a library. A straight line joins them, and beneath it sits a right-angled triangle: one side running across, one running up. Next to the grid, the working writes itself out line by line as the pins move.",
                    manipulate: "Drag either pin anywhere on the grid and watch the across step, the up step and the straight-line distance change together",
                    reveals: "The distance is the sloping side of a right-angled triangle, so it is always found by squaring, adding, then taking the square root.",
                    targetsMisconception: "Students add the squares and stop there, giving 25 instead of 5",
                    paradigm: "conventional",
                    recommended: true,
                    secondView: {
                        shows: "The calculation written out step by step, with the squared total and the final rooted distance on separate lines",
                        role: "constructing",
                        syncedBy: "distancePointA and distancePointB, plus a shared hover highlight linking each triangle side to its term in the working",
                    },
                },
                {
                    id: "distance-guess-on-ruler",
                    title: "Two pins on a grid with a ruler beneath, marked with a guess and the squared total",
                    looks: "Imagine two pins joined by a slanted line, and under the grid a long ruler numbered from zero upward. A movable arrow sits on the ruler, and a second faint mark shows where the squared total lands, far off to the right of the true answer.",
                    manipulate: "Slide the arrow along the ruler to where they think the true distance is, then release it to see the real distance appear",
                    reveals: "Guesses land near the sloping side's real length, nowhere near the squared total, so the square root is not an optional last step.",
                    targetsMisconception: "Students add the squares and stop there, giving 25 instead of 5",
                    paradigm: "prediction",
                },
                {
                    id: "distance-five-away",
                    title: "One fixed pin on a grid, with every point students place labelled by its distance",
                    looks: "Imagine a single pin at the centre of a grid. Wherever students tap, a small dot appears with its distance from the pin written beside it. Dots that land exactly five away turn teal and stay, while the others fade to grey.",
                    manipulate: "Tap around the grid hunting for points that sit exactly five away from the pin",
                    reveals: "Many different across-and-up pairs give the same distance, and the teal dots slowly curve into a ring around the pin.",
                    paradigm: "goal",
                },
            ]}
        />
    </Block>,

    <StackLayout key="layout-distance-worked-example" maxWidth="xl">
        <Block id="distance-worked-example" padding="sm">
            <EditableParagraph id="para-distance-worked-example" blockId="distance-worked-example">
                The across step and the up step get squared and added, and that running total is
                d squared, not d. From (1, 2) to (4, 6) the steps are 3 and 4, so the total comes
                to 9 + 16 = 25. Only the square root of that, which is 5, is the actual distance.
            </EditableParagraph>
        </Block>
    </StackLayout>,
];

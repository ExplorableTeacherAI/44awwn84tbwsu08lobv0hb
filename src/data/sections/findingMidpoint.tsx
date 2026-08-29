import { type ReactElement } from "react";
import { Block } from "@/components/templates";
import { StackLayout } from "@/components/layouts";
import { EditableH3, EditableParagraph } from "@/components/atoms";
import { FormulaBlock } from "@/components/molecules";
import { VisualOptionCards } from "@/components/organisms";

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
                Now suppose you want the meeting spot exactly halfway between the two pins. The x
                of that spot sits halfway between the two x values, and its y sits halfway between
                the two y values. Halfway between two numbers is simply their average: add them,
                then halve.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-midpoint-formula" maxWidth="xl">
        <Block id="midpoint-formula" padding="lg">
            <FormulaBlock latex="M = \left( \frac{x_1 + x_2}{2},\ \frac{y_1 + y_2}{2} \right)" />
        </Block>
    </StackLayout>,

    <Block key="layout-midpoint-visual" id="midpoint-visual">
        <VisualOptionCards
            blockId="midpoint-visual"
            cards={[
                {
                    id: "midpoint-average-versus-subtract",
                    title: "Two pins joined by a line, with the averaged middle and the subtracted answer both marked",
                    looks: "Imagine two pins joined by a straight line on a grid. A solid teal marker sits on that line, worked out by averaging. A second grey marker, worked out by subtracting, drifts off somewhere near the corner of the grid, nowhere near the line at all.",
                    manipulate: "Drag either pin around the grid and watch which marker stays glued to the middle of the line and which one wanders away",
                    reveals: "Averaging always lands between the two pins, while subtracting gives how far apart they are, which is a length and not a place.",
                    targetsMisconception: "Students subtract the coordinates instead of averaging them when finding a midpoint",
                    paradigm: "comparison",
                },
                {
                    id: "midpoint-place-your-guess",
                    title: "Two pins on a grid with a faint marker students place before the real middle appears",
                    looks: "Imagine two pins on a grid joined by a straight line, with a faint hollow marker waiting beside it. Once the marker is dropped and released, the true middle appears in teal, and a small ruler shows how far the guess sat from it.",
                    manipulate: "Drop the faint marker where they think the exact middle of the line is, then release to compare it with the real one",
                    reveals: "The middle always sits on the line and its coordinates are the two averages, which is not what subtracting would have given.",
                    targetsMisconception: "Students subtract the coordinates instead of averaging them when finding a midpoint",
                    paradigm: "prediction",
                    recommended: true,
                },
                {
                    id: "midpoint-drag-the-middle",
                    title: "A grid with a fixed pin, a star target, and a middle marker students drag onto it",
                    looks: "Imagine one pin fixed at the bottom left of a grid and a star sitting somewhere in the middle of it. A second pin is joined to the fixed one, and a marker rides halfway along that line, following it wherever it goes.",
                    manipulate: "Drag the halfway marker onto the star and watch the free pin swing out to wherever it has to be",
                    reveals: "The free pin always finishes exactly as far past the star as the fixed pin sits before it, which is what averaging really means.",
                    paradigm: "inversion",
                },
            ]}
        />
    </Block>,

    <StackLayout key="layout-midpoint-worked-example" maxWidth="xl">
        <Block id="midpoint-worked-example" padding="sm">
            <EditableParagraph id="para-midpoint-worked-example" blockId="midpoint-worked-example">
                Subtracting is the tempting mistake here, because subtracting is exactly what we
                did for distance. But 4 − 1 = 3 tells you how far apart the two x values are, not
                where the middle of them is. Halfway between 1 and 4 is (1 + 4) ÷ 2 = 2.5, and
                that answer genuinely sits between them.
            </EditableParagraph>
        </Block>
    </StackLayout>,
];

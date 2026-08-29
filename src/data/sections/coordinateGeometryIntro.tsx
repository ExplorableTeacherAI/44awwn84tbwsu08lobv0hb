import { type ReactElement } from "react";
import { Block } from "@/components/templates";
import { StackLayout } from "@/components/layouts";
import { EditableH1, EditableParagraph } from "@/components/atoms";

export const coordinateGeometryIntroBlocks: ReactElement[] = [
    <StackLayout key="layout-coordinate-intro-title" maxWidth="xl">
        <Block id="coordinate-intro-title" padding="md">
            <EditableH1 id="h1-coordinate-intro-title" blockId="coordinate-intro-title">
                Coordinate Geometry
            </EditableH1>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-coordinate-intro-hook" maxWidth="xl">
        <Block id="coordinate-intro-hook" padding="sm">
            <EditableParagraph id="para-coordinate-intro-hook" blockId="coordinate-intro-hook">
                Open a map app and drop two pins. Almost instantly it tells you how far apart
                they are, and it never once reaches for a ruler. All it has to work with is two
                pairs of numbers, one for each pin.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-coordinate-intro-promise" maxWidth="xl">
        <Block id="coordinate-intro-promise" padding="sm">
            <EditableParagraph id="para-coordinate-intro-promise" blockId="coordinate-intro-promise">
                That is coordinate geometry: turning positions on a grid into numbers you can
                calculate with. Here is what you will be able to do by the end.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-coordinate-intro-point-distance" maxWidth="xl">
        <Block id="coordinate-intro-point-distance" padding="sm">
            <EditableParagraph id="para-coordinate-intro-point-distance" blockId="coordinate-intro-point-distance">
                • Work out the distance between two points.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-coordinate-intro-point-midpoint" maxWidth="xl">
        <Block id="coordinate-intro-point-midpoint" padding="sm">
            <EditableParagraph id="para-coordinate-intro-point-midpoint" blockId="coordinate-intro-point-midpoint">
                • Find the halfway point between them.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-coordinate-intro-point-line" maxWidth="xl">
        <Block id="coordinate-intro-point-line" padding="sm">
            <EditableParagraph id="para-coordinate-intro-point-line" blockId="coordinate-intro-point-line">
                • Describe a straight line with an equation.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-coordinate-intro-point-circle" maxWidth="xl">
        <Block id="coordinate-intro-point-circle" padding="sm">
            <EditableParagraph id="para-coordinate-intro-point-circle" blockId="coordinate-intro-point-circle">
                • Do the same for a circle.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-coordinate-intro-prerequisite" maxWidth="xl">
        <Block id="coordinate-intro-prerequisite" padding="sm">
            <EditableParagraph id="para-coordinate-intro-prerequisite" blockId="coordinate-intro-prerequisite">
                If you can read a point off an x-y grid, you have everything you need to start.
            </EditableParagraph>
        </Block>
    </StackLayout>,
];

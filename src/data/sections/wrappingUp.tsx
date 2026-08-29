import { type ReactElement } from "react";
import { Block } from "@/components/templates";
import { StackLayout } from "@/components/layouts";
import { EditableH2, EditableParagraph } from "@/components/atoms";

export const wrappingUpBlocks: ReactElement[] = [
    <StackLayout key="layout-wrapping-up-heading" maxWidth="xl">
        <Block id="wrapping-up-heading" padding="md">
            <EditableH2 id="h2-wrapping-up-heading" blockId="wrapping-up-heading">
                Wrapping Up
            </EditableH2>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-wrapping-up-insight" maxWidth="xl">
        <Block id="wrapping-up-insight" padding="sm">
            <EditableParagraph id="para-wrapping-up-insight" blockId="wrapping-up-insight">
                Every formula here grew out of the same right-angled triangle. Distance squares the
                across step and the up step and then roots the total, the circle equation is that
                same distance held fixed at r, and the midpoint just halves each step instead of
                squaring it. Four formulas, one idea underneath.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-wrapping-up-next" maxWidth="xl">
        <Block id="wrapping-up-next" padding="sm">
            <EditableParagraph id="para-wrapping-up-next" blockId="wrapping-up-next">
                Map apps, game engines and GPS all run on exactly this, checking whether a point
                falls inside a circle or which side of a line it lands on, millions of times a
                second. Next you will put a line and a circle on the same grid and work out
                exactly where they cross.
            </EditableParagraph>
        </Block>
    </StackLayout>,
];

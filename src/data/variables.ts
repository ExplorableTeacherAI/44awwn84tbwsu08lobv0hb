/**
 * Variables Configuration
 * =======================
 * 
 * CENTRAL PLACE TO DEFINE ALL SHARED VARIABLES
 * 
 * This file defines all variables that can be shared across sections.
 * AI agents should read this file to understand what variables are available.
 * 
 * USAGE:
 * 1. Define variables here with their default values and metadata
 * 2. Use them in any section with: const x = useVar('variableName', defaultValue)
 * 3. Update them with: setVar('variableName', newValue)
 */

import { type VarValue } from '@/stores';

/**
 * Variable definition with metadata
 */
export interface VariableDefinition {
    /** Default value */
    defaultValue: VarValue;
    /** Human-readable label */
    label?: string;
    /** Description for AI agents */
    description?: string;
    /** Variable type hint */
    type?: 'number' | 'text' | 'boolean' | 'select' | 'array' | 'object' | 'spotColor' | 'linkedHighlight';
    /** Unit (e.g., 'Hz', '°', 'm/s') - for numbers */
    unit?: string;
    /** Minimum value (for number sliders) */
    min?: number;
    /** Maximum value (for number sliders) */
    max?: number;
    /** Step increment (for number sliders) */
    step?: number;
    /** Display color for InlineScrubbleNumber / InlineSpotColor (e.g. '#D81B60') */
    color?: string;
    /** Options for 'select' type variables */
    options?: string[];
    /** Placeholder text for text inputs */
    placeholder?: string;
    /**
     * Correct answer for cloze input validation.
     * Accepts a single string, pipe-separated alternates (e.g. "first | 1 | 1st"),
     * or an array of accepted answers (e.g. ["first", "1", "1st"]).
     */
    correctAnswer?: string | string[];
    /** Whether cloze matching is case sensitive */
    caseSensitive?: boolean;
    /** Background color for inline components */
    bgColor?: string;
    /** Schema hint for object types (for AI agents) */
    schema?: string;
}

/**
 * =====================================================
 * 🎯 DEFINE YOUR VARIABLES HERE
 * =====================================================
 * 
 * SUPPORTED TYPES:
 * 
 * 1. NUMBER (slider):
 *    { defaultValue: 5, type: 'number', min: 0, max: 10, step: 1 }
 * 
 * 2. TEXT (free text):
 *    { defaultValue: 'Hello', type: 'text', placeholder: 'Enter text...' }
 * 
 * 3. SELECT (dropdown):
 *    { defaultValue: 'sine', type: 'select', options: ['sine', 'cosine', 'tangent'] }
 * 
 * 4. BOOLEAN (toggle):
 *    { defaultValue: true, type: 'boolean' }
 * 
 * 5. ARRAY (list of numbers):
 *    { defaultValue: [1, 2, 3], type: 'array' }
 * 
 * 6. OBJECT (complex data):
 *    { defaultValue: { x: 5, y: 10 }, type: 'object', schema: '{ x: number, y: number }' }
 */
export const variableDefinitions: Record<string, VariableDefinition> = {
    // ========================================
    // PART 1 — DISTANCE BETWEEN TWO POINTS
    // ========================================

    /** First pin on the grid — the "cafe". Snapped to whole grid squares. */
    distancePinAx: {
        defaultValue: 1,
        type: 'number',
        label: 'First pin, across',
        description: 'x coordinate of the first pin in the distance figure',
        min: 0,
        max: 9,
        step: 1,
        color: '#62D0AD',
    },
    distancePinAy: {
        defaultValue: 2,
        type: 'number',
        label: 'First pin, up',
        description: 'y coordinate of the first pin in the distance figure',
        min: 0,
        max: 8,
        step: 1,
        color: '#62D0AD',
    },

    /** Second pin on the grid — the "library". Snapped to whole grid squares. */
    distancePinBx: {
        defaultValue: 4,
        type: 'number',
        label: 'Second pin, across',
        description: 'x coordinate of the second pin in the distance figure',
        min: 0,
        max: 9,
        step: 1,
        color: '#62D0AD',
    },
    distancePinBy: {
        defaultValue: 6,
        type: 'number',
        label: 'Second pin, up',
        description: 'y coordinate of the second pin in the distance figure',
        min: 0,
        max: 8,
        step: 1,
        color: '#62D0AD',
    },

    /**
     * Shared highlight channel for the linked pair (grid + written working).
     * Values: '' | 'across' | 'up' | 'squares' | 'distance'
     */
    distanceHighlight: {
        defaultValue: '',
        type: 'text',
        label: 'Distance view highlight',
        description: 'Which quantity is highlighted across the grid and the working',
        color: '#62D0AD',
        bgColor: 'rgba(98, 208, 173, 0.22)',
    },

    /** Assessment — the square-root step (misconception target). */
    answerDistanceRoot: {
        defaultValue: '',
        type: 'text',
        label: 'Distance from a squared total',
        description: 'Student answer: the distance when the squared total is 100',
        placeholder: '???',
        correctAnswer: '10',
        color: '#8E90F5',
    },

    // ========================================
    // PART 1 — FINDING THE MIDPOINT
    // ========================================

    /** The "park" pin. Snapped to whole grid squares. */
    midpointPinAx: {
        defaultValue: 1,
        type: 'number',
        label: 'Park pin, across',
        description: 'x coordinate of the first pin in the midpoint figure',
        min: 0,
        max: 9,
        step: 1,
        color: '#62D0AD',
    },
    midpointPinAy: {
        defaultValue: 1,
        type: 'number',
        label: 'Park pin, up',
        description: 'y coordinate of the first pin in the midpoint figure',
        min: 0,
        max: 8,
        step: 1,
        color: '#62D0AD',
    },

    /** The "shop" pin. Snapped to whole grid squares. */
    midpointPinBx: {
        defaultValue: 6,
        type: 'number',
        label: 'Shop pin, across',
        description: 'x coordinate of the second pin in the midpoint figure',
        min: 0,
        max: 9,
        step: 1,
        color: '#62D0AD',
    },
    midpointPinBy: {
        defaultValue: 7,
        type: 'number',
        label: 'Shop pin, up',
        description: 'y coordinate of the second pin in the midpoint figure',
        min: 0,
        max: 8,
        step: 1,
        color: '#62D0AD',
    },

    /** Highlight channel for the midpoint figure: '' | 'join' | 'average' | 'subtract' */
    midpointHighlight: {
        defaultValue: '',
        type: 'text',
        label: 'Midpoint view highlight',
        description: 'Which part of the midpoint figure is currently highlighted',
        color: '#62D0AD',
        bgColor: 'rgba(98, 208, 173, 0.22)',
    },

    /** Assessment — averaging, with an answer that lands on a half. */
    answerMidpointAverage: {
        defaultValue: '',
        type: 'text',
        label: 'Midpoint x coordinate',
        description: 'Student answer: the x coordinate of the midpoint of (2, 3) and (7, 8)',
        placeholder: '???',
        correctAnswer: ['4.5', '4 1/2', '9/2'],
        color: '#8E90F5',
    },

    /** Assessment — what subtracting actually gives (misconception target). */
    answerMidpointSubtract: {
        defaultValue: '',
        type: 'select',
        label: 'What subtracting gives',
        description: 'Student answer: what the subtracted value tells you',
        placeholder: '???',
        correctAnswer: 'how far apart the two x values are',
        options: [
            'how far apart the two x values are',
            'the x coordinate of the midpoint',
            'the x coordinate of the gate',
        ],
        color: '#8E90F5',
    },

    // ========================================
    // PART 2 — STRAIGHT LINES
    // ========================================

    /** The gradient m: how far the line climbs for one step to the right. */
    lineGradient: {
        defaultValue: 2,
        type: 'number',
        label: 'Gradient',
        description: 'The climb of the line for every one step to the right',
        min: -1.5,
        max: 2,
        step: 0.5,
        color: '#62D0AD',
    },

    /** The intercept c: the height at which the line crosses the y-axis. */
    lineIntercept: {
        defaultValue: 1,
        type: 'number',
        label: 'Y-axis crossing',
        description: 'The height at which the line crosses the y-axis',
        min: 0,
        max: 4,
        step: 1,
        color: '#62D0AD',
    },

    /** The x value fed into the equation, marked on the line. */
    lineProbeX: {
        defaultValue: 4,
        type: 'number',
        label: 'x value',
        description: 'The x value substituted into the line equation',
        min: 0,
        max: 9,
        step: 1,
        color: '#62D0AD',
    },

    /** Highlight channel for the line pair: '' | 'gradient' | 'intercept' | 'probe' */
    lineHighlight: {
        defaultValue: '',
        type: 'text',
        label: 'Line view highlight',
        description: 'Which part of the line and its equation is highlighted',
        color: '#62D0AD',
        bgColor: 'rgba(98, 208, 173, 0.22)',
    },

    /** Assessment — substituting an x value into y = mx + c. */
    answerLineHeight: {
        defaultValue: '',
        type: 'text',
        label: 'Height of the line at x = 4',
        description: 'Student answer: the height of y = 1.5x + 4 at x = 4',
        placeholder: '???',
        correctAnswer: '10',
        color: '#8E90F5',
    },

    /** Assessment — what sliding a line up the grid actually changes. */
    answerLineShift: {
        defaultValue: '',
        type: 'select',
        label: 'What sliding the line changes',
        description: 'Student answer: which number changes when a line slides up',
        placeholder: '???',
        correctAnswer: 'only c, the y-axis crossing',
        options: [
            'only c, the y-axis crossing',
            'only m, the gradient',
            'both m and c',
        ],
        color: '#8E90F5',
    },

    // ========================================
    // PART 3 — CIRCLES
    // ========================================

    /** The centre pin, snapped to whole grid squares. */
    circleCentreX: {
        defaultValue: -2,
        type: 'number',
        label: 'Centre, across',
        description: 'x coordinate of the circle centre',
        min: -3,
        max: 3,
        step: 1,
        color: '#62D0AD',
    },
    circleCentreY: {
        defaultValue: 1,
        type: 'number',
        label: 'Centre, up',
        description: 'y coordinate of the circle centre',
        min: -3,
        max: 3,
        step: 1,
        color: '#62D0AD',
    },

    /** The radius, set by pulling the bead in or out along the rim. */
    circleRadius: {
        defaultValue: 3,
        type: 'number',
        label: 'Radius',
        description: 'Radius of the circle, set by the bead on the rim',
        min: 1,
        max: 3,
        step: 1,
        color: '#62D0AD',
    },

    /** Where the bead sits around the rim, in degrees. */
    circleBeadAngle: {
        defaultValue: 30,
        type: 'number',
        label: 'Bead angle',
        description: 'Position of the bead around the rim, in degrees',
        min: 0,
        max: 359,
        step: 1,
        color: '#62D0AD',
    },

    /** Highlight channel for the circle figure: '' | 'centre' | 'radius' | 'found' */
    circleHighlight: {
        defaultValue: '',
        type: 'text',
        label: 'Circle view highlight',
        description: 'Which part of the circle figure is currently highlighted',
        color: '#62D0AD',
        bgColor: 'rgba(98, 208, 173, 0.22)',
    },

    /** Assessment — reading the radius out of r squared. */
    answerCircleRadius: {
        defaultValue: '',
        type: 'text',
        label: 'Radius from the equation',
        description: 'Student answer: the radius of (x - 4)^2 + (y - 1)^2 = 36',
        placeholder: '???',
        correctAnswer: '6',
        color: '#8E90F5',
    },

    /** Assessment — reading the centre, signs and all. */
    answerCircleCentre: {
        defaultValue: '',
        type: 'select',
        label: 'Centre from the equation',
        description: 'Student answer: the centre of (x - 4)^2 + (y + 1)^2 = 36',
        placeholder: '???',
        correctAnswer: '(4, −1)',
        options: ['(4, −1)', '(−4, 1)', '(4, 1)'],
        color: '#8E90F5',
    },

    /** Assessment — full application with new coordinates. */
    answerDistanceApply: {
        defaultValue: '',
        type: 'text',
        label: 'Distance between two new pins',
        description: 'Student answer: the distance from (2, 1) to (5, 5)',
        placeholder: '???',
        correctAnswer: '5',
        color: '#8E90F5',
    },

    // Uncomment and modify these examples for your lesson:

    /*
    // ─────────────────────────────────────────
    // NUMBER - Use with sliders
    // ─────────────────────────────────────────
    myValue: {
        defaultValue: 5,
        type: 'number',
        label: 'My Value',
        description: 'A number that controls something',
        unit: 'm',           // optional unit display
        min: 0,
        max: 10,
        step: 0.5,
    },

    // ─────────────────────────────────────────
    // TEXT - Free text input
    // ─────────────────────────────────────────
    lessonTitle: {
        defaultValue: 'My Lesson',
        type: 'text',
        label: 'Lesson Title',
        description: 'The title of your lesson',
        placeholder: 'Enter a title...',
    },

    // ─────────────────────────────────────────
    // SELECT - Dropdown with options
    // ─────────────────────────────────────────
    difficulty: {
        defaultValue: 'medium',
        type: 'select',
        label: 'Difficulty',
        description: 'The difficulty level of the lesson',
        options: ['easy', 'medium', 'hard', 'expert'],
    },

    // ─────────────────────────────────────────
    // BOOLEAN - Toggle switch
    // ─────────────────────────────────────────
    showHints: {
        defaultValue: true,
        type: 'boolean',
        label: 'Show Hints',
        description: 'Toggle to show or hide hints',
    },

    // ─────────────────────────────────────────
    // ARRAY - List of numbers
    // ─────────────────────────────────────────
    dataPoints: {
        defaultValue: [1, 4, 9, 16, 25],
        type: 'array',
        label: 'Data Points',
        description: 'Y-values for plotting a graph',
    },

    // ─────────────────────────────────────────
    // OBJECT - Complex structured data
    // ─────────────────────────────────────────
    graphSettings: {
        defaultValue: { 
            xMin: -10, 
            xMax: 10, 
            showGrid: true 
        },
        type: 'object',
        label: 'Graph Settings',
        description: 'Configuration for the graph display',
        schema: '{ xMin: number, xMax: number, showGrid: boolean }',
    },
    */
};

/**
 * Get all variable names (for AI agents to discover)
 */
export const getVariableNames = (): string[] => {
    return Object.keys(variableDefinitions);
};

/**
 * Get a variable's default value
 */
export const getDefaultValue = (name: string): VarValue => {
    return variableDefinitions[name]?.defaultValue ?? 0;
};

/**
 * Get a variable's metadata
 */
export const getVariableInfo = (name: string): VariableDefinition | undefined => {
    return variableDefinitions[name];
};

/**
 * Get all default values as a record (for initialization)
 */
export const getDefaultValues = (): Record<string, VarValue> => {
    const defaults: Record<string, VarValue> = {};
    for (const [name, def] of Object.entries(variableDefinitions)) {
        defaults[name] = def.defaultValue;
    }
    return defaults;
};

/**
 * Get number props for InlineScrubbleNumber from a variable definition.
 * Use with getVariableInfo(name) in blocks.tsx, or getExampleVariableInfo(name) in exampleBlocks.tsx.
 */
export function numberPropsFromDefinition(def: VariableDefinition | undefined): {
    defaultValue?: number;
    min?: number;
    max?: number;
    step?: number;
    color?: string;
} {
    if (!def || def.type !== 'number') return {};
    return {
        defaultValue: def.defaultValue as number,
        min: def.min,
        max: def.max,
        step: def.step,
        ...(def.color ? { color: def.color } : {}),
    };
}

/**
 * Get cloze input props for InlineClozeInput from a variable definition.
 * Use with getVariableInfo(name) in blocks.tsx, or getExampleVariableInfo(name) in exampleBlocks.tsx.
 */
/**
 * Get cloze choice props for InlineClozeChoice from a variable definition.
 * Use with getVariableInfo(name) in blocks.tsx.
 */
export function choicePropsFromDefinition(def: VariableDefinition | undefined): {
    placeholder?: string;
    color?: string;
    bgColor?: string;
} {
    if (!def || def.type !== 'select') return {};
    return {
        ...(def.placeholder ? { placeholder: def.placeholder } : {}),
        ...(def.color ? { color: def.color } : {}),
        ...(def.bgColor ? { bgColor: def.bgColor } : {}),
    };
}

/**
 * Get toggle props for InlineToggle from a variable definition.
 * Use with getVariableInfo(name) in blocks.tsx.
 */
export function togglePropsFromDefinition(def: VariableDefinition | undefined): {
    color?: string;
    bgColor?: string;
} {
    if (!def || def.type !== 'select') return {};
    return {
        ...(def.color ? { color: def.color } : {}),
        ...(def.bgColor ? { bgColor: def.bgColor } : {}),
    };
}

export function clozePropsFromDefinition(def: VariableDefinition | undefined): {
    placeholder?: string;
    color?: string;
    bgColor?: string;
    caseSensitive?: boolean;
} {
    if (!def || def.type !== 'text') return {};
    return {
        ...(def.placeholder ? { placeholder: def.placeholder } : {}),
        ...(def.color ? { color: def.color } : {}),
        ...(def.bgColor ? { bgColor: def.bgColor } : {}),
        ...(def.caseSensitive !== undefined ? { caseSensitive: def.caseSensitive } : {}),
    };
}

/**
 * Get spot-color props for InlineSpotColor from a variable definition.
 * Extracts the `color` field.
 *
 * @example
 * <InlineSpotColor
 *     varName="radius"
 *     {...spotColorPropsFromDefinition(getVariableInfo('radius'))}
 * >
 *     radius
 * </InlineSpotColor>
 */
export function spotColorPropsFromDefinition(def: VariableDefinition | undefined): {
    color: string;
} {
    return {
        color: def?.color ?? '#8B5CF6',
    };
}

/**
 * Get linked-highlight props for InlineLinkedHighlight from a variable definition.
 * Extracts the `color` and `bgColor` fields.
 *
 * @example
 * <InlineLinkedHighlight
 *     varName="activeHighlight"
 *     highlightId="radius"
 *     {...linkedHighlightPropsFromDefinition(getVariableInfo('activeHighlight'))}
 * >
 *     radius
 * </InlineLinkedHighlight>
 */
export function linkedHighlightPropsFromDefinition(def: VariableDefinition | undefined): {
    color?: string;
    bgColor?: string;
} {
    return {
        ...(def?.color ? { color: def.color } : {}),
        ...(def?.bgColor ? { bgColor: def.bgColor } : {}),
    };
}

/**
 * Build the `variables` prop for FormulaBlock from variable definitions.
 *
 * Takes an array of variable names and returns the config map expected by
 * `<FormulaBlock variables={...} />`.
 *
 * @example
 * import { scrubVarsFromDefinitions } from './variables';
 *
 * <FormulaBlock
 *     latex="\scrub{mass} \times \scrub{accel}"
 *     variables={scrubVarsFromDefinitions(['mass', 'accel'])}
 * />
 */
export function scrubVarsFromDefinitions(
    varNames: string[],
): Record<string, { min?: number; max?: number; step?: number; color?: string }> {
    const result: Record<string, { min?: number; max?: number; step?: number; color?: string }> = {};
    for (const name of varNames) {
        const def = variableDefinitions[name];
        if (!def) continue;
        result[name] = {
            ...(def.min !== undefined ? { min: def.min } : {}),
            ...(def.max !== undefined ? { max: def.max } : {}),
            ...(def.step !== undefined ? { step: def.step } : {}),
            ...(def.color ? { color: def.color } : {}),
        };
    }
    return result;
}

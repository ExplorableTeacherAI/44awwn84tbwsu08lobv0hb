/**
 * Lesson colour scheme
 * ====================
 *
 * ONE quantity, ONE colour, everywhere it appears: in the figure, in the
 * formula, in the scrubbable numbers and in the prose. Every colour below is
 * muted (never a saturated primary) and reads clearly on the white ground.
 *
 * | Role     | Meaning in this lesson                                  |
 * |----------|---------------------------------------------------------|
 * | result   | the quantity being worked out (d, the middle, the rim)   |
 * | across   | anything living in the x direction                       |
 * | up       | anything living in the y direction                       |
 * | derived  | a squared or substituted value, one step further on      |
 * | wrong    | the tempting wrong method, kept quiet on purpose         |
 * | answer   | a blank the student fills in                             |
 * | choice   | a word or symbol the student picks inside the prose      |
 */
export const LESSON_COLORS = {
    result: '#62D0AD',   // soft teal
    across: '#8E90F5',   // soft indigo
    up: '#F7B23B',       // warm amber
    derived: '#AC8BF9',  // soft violet
    wrong: '#94A3B8',    // soft slate
    answer: '#62CCF9',   // soft sky
    choice: '#F8A0CD',   // soft rose
} as const;

/** Matching translucent backgrounds for inline highlight chips. */
export const LESSON_BACKGROUNDS = {
    result: 'rgba(98, 208, 173, 0.22)',
    across: 'rgba(142, 144, 245, 0.22)',
    up: 'rgba(247, 178, 59, 0.22)',
    derived: 'rgba(172, 139, 249, 0.22)',
    wrong: 'rgba(148, 163, 184, 0.22)',
    answer: 'rgba(98, 204, 249, 0.18)',
    choice: 'rgba(248, 160, 205, 0.18)',
} as const;

export type LessonColorRole = keyof typeof LESSON_COLORS;

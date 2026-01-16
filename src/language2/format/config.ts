/**
 * Enum for code alignment modes
 */
export type AlignMode = 'indent' | 'label' | 'segment';

/**
 * Enum for casing formatting modes
 */
export type CasingMode = 'lower' | 'upper' | 'title' | 'off';

/**
 * Enum for space after comma configuration
 */
export type SpaceAfterCommaMode = 'always' | 'never' | 'off';

/**
 * Interface for casing configuration sub-items
 */
export interface CasingConfig {
  /**
   * Casing format for instructions (MOV, JMP, PUSH, etc.)
   * @default 'off'
   */
  instruction: CasingMode;
  
  /**
   * Casing format for registers (AX, SI, CS, etc.)
   * @default 'off'
   */
  register: CasingMode;
  
  /**
   * Casing format for directives (INCLUDE, END, PROC, etc.)
   * @default 'off'
   */
  directive: CasingMode;
  
  /**
   * Casing format for operators (HIGH, LOW, PTR, etc.)
   * @default 'off'
   */
  operator: CasingMode;
}

/**
 * Main interface for MASM/TASM formatting configuration
 */
export interface MasmtasmFormatConfig {
  /**
   * Code alignment mode
   * @default 'segment'
   * - indent: Indent only with fixed size
   * - label: Align code to its label
   * - segment: Align code within segment
   */
  align: AlignMode;

  /**
   * Configuration for identifier casing formatting
   * 
   * `lower` - all lower case
   * `upper` - all upper case
   * `title` - title case
   * `off` - do not change the casing
   */
  casing: CasingConfig;

  /**
   * Whether to align operands
   * @default true
   */
  alignOperand: boolean;

  /**
   * Whether to align trailing comments
   * @default true
   */
  alignTrailingComment: boolean;

  /**
   * Whether to align single line comments
   * @default true
   */
  alignSingleLineComment: boolean;

  /**
   * Space after comma configuration
   * @default 'off'
   * - always: Always keep a space after comma
   * - never: Remove space after comma
   * - off: Do not change the space after comma
   */
  spaceAfterComma: SpaceAfterCommaMode;
}

/**
 * Complete plugin configuration interface (including namespace)
 */
export interface MasmtasmPluginConfig {
  "masmtasm.language.Format": MasmtasmFormatConfig;
}

/**
 * Default configuration constants
 */
export const DEFAULT_FORMAT_CONFIG: MasmtasmFormatConfig = {
  align: 'segment',
  casing: {
    instruction: 'off',
    register: 'off',
    directive: 'off',
    operator: 'off'
  },
  alignOperand: true,
  alignTrailingComment: true,
  alignSingleLineComment: true,
  spaceAfterComma: 'off'
};
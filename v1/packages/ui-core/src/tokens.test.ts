import { describe, expect, it } from 'vitest';
import { DESIGN_SYSTEM_VERSION, tokens } from './tokens';

describe('tokens do design system', () => {
  it('mantém a cor primária oficial e a escala de 4px', () => {
    expect(tokens.color.primary).toBe('#0B3D91');
    expect(tokens.space).toMatchObject({ 1: '4px', 2: '8px', 4: '16px', 16: '64px' });
    expect(DESIGN_SYSTEM_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

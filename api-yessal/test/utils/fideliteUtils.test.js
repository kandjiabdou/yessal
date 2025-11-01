jest.resetModules();

const mockFindUnique = jest.fn();
jest.mock('../../src/utils/prismaClient', () => ({
  fidelite: {
    findUnique: mockFindUnique
  }
}));

const fideliteUtils = require('../../src/utils/fideliteUtils');

describe('fideliteUtils', () => {
  afterEach(() => {
    mockFindUnique.mockReset();
    jest.restoreAllMocks();
  });

  test('validerFormatNumeroCarte returns false for invalid inputs', () => {
    expect(fideliteUtils.validerFormatNumeroCarte(null)).toBe(false);
    expect(fideliteUtils.validerFormatNumeroCarte('INVALID')).toBe(false);
  });

  test('validerFormatNumeroCarte returns true for valid format', () => {
    expect(fideliteUtils.validerFormatNumeroCarte('TH12345ABC')).toBe(true);
  });

  test('extraireInfosNumeroCarte throws for invalid format', () => {
    expect(() => fideliteUtils.extraireInfosNumeroCarte('BAD')).toThrow('Format de numéro de carte invalide');
  });

  test('extraireInfosNumeroCarte extracts correct parts', () => {
    const info = fideliteUtils.extraireInfosNumeroCarte('TH98765KAS');
    expect(info.ville).toBe('TH');
    expect(info.numero).toBe('98765');
    expect(info.lettresNom).toBe('KAS');
  });

  test('genererNumeroCarteFidelite throws when name missing', async () => {
    await expect(fideliteUtils.genererNumeroCarteFidelite(null)).rejects.toThrow('Le nom est requis pour générer le numéro de carte');
  });

  test('genererNumeroCarteFidelite returns a unique number', async () => {
    // Control randomness for determinism
    jest.spyOn(Math, 'random').mockReturnValue(0.12345);

    // First call indicates no existing record
    mockFindUnique.mockResolvedValueOnce(null);

    const numero = await fideliteUtils.genererNumeroCarteFidelite('Kasse');
    expect(numero.startsWith('TH')).toBe(true);
    expect(numero.length).toBe(10);
    expect(mockFindUnique).toHaveBeenCalled();
  });
});

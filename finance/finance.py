import json

def repartition_benefices(recettes, charges_fixes, amortissement_pct, associes):
    """
    Calcule la répartition des bénéfices entre les associés.

    recettes : chiffre d'affaires total (int ou float)
    charges_fixes : dépenses fixes (loyer, salaires employés, etc.)
    amortissement_pct : % du bénéfice brut alloué en réserve (0.1 = 10%)
    associes : liste de dictionnaires [{
        'nom': str,
        'parts': float,   # % de capital détenu
        'travail': float,  # % de la masse salariale (pondération travail)
        'valeur_objectif': float  # valeur objectif pour la répartition
    }]
    """

    # Étape 1 : résultat brut
    resultat_brut = recettes - charges_fixes

    if resultat_brut <= 0:
        return {a['nom']: {'salaire': 0, 'dividendes': 0, 'total': 0} for a in associes}

    # Étape 2 : amortissement / réserve
    reserve = resultat_brut * amortissement_pct
    resultat_apres_reserve = resultat_brut - reserve

    # Étape 3 : répartition des "salaires" (travail)
    total_travail = sum(a['travail'] for a in associes)
    salaires = {}
    masse_salariale = resultat_apres_reserve * 0.5  # 50% pour le travail, adaptable

    for a in associes:
        if total_travail > 0:
            salaires[a['nom']] = masse_salariale * (a['travail'] / total_travail)
        else:
            salaires[a['nom']] = 0

    # Étape 4 : distribution des dividendes (capital)
    reste_dividendes = resultat_apres_reserve - sum(salaires.values())
    dividendes = {}
    total_parts = sum(a['parts'] for a in associes)

    for a in associes:
        dividendes[a['nom']] = reste_dividendes * (a['parts'] / total_parts)

    # Étape 5 : total par associé
    repartition = {}
    for a in associes:
        nom = a['nom']
        repartition[nom] = {
            'salaire': round(salaires[nom], 2),
            'dividendes': round(dividendes[nom], 2),
            'total': round(salaires[nom] + dividendes[nom], 2)
        }

    # Ajouter la réserve pour info
    repartition['reserve'] = round(reserve, 2)
    return repartition


# Exemple d'utilisation
associes = [
    {'nom': 'Directeur - BMK', 'parts': 51, 'travail': 20, "valeur_objectif": 50000},
    {'nom': 'Directrice - NFK', 'parts': 23, 'travail': 75, "valeur_objectif": 30000},
    {'nom': 'Gérant 2 - ARK', 'parts': 5, 'travail': 0, "valeur_objectif": 10000},
    {'nom': 'Informaticien - ABK', 'parts': 21, 'travail': 5, "valeur_objectif": 20000}
]

# voir aussi si 

resultat = repartition_benefices(
    recettes=692300,      # chiffre d'affaires
    charges_fixes=303000,  # charges fixes (employé + local)
    amortissement_pct=0.2, # 20 % en réserve
    associes=associes
)

print(json.dumps(resultat, indent=4, ensure_ascii=False))
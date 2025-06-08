import 'disease_detection_result.dart';

class DiseaseDatabase {
  static final Map<String, DiseaseInfo> diseases = {
    'ich': DiseaseInfo(
      id: 'ich',
      name: 'Ich (White Spot Disease)',
      scientificName: 'Ichthyophthirius multifiliis',
      symptoms: [
        'White spots on body and fins',
        'Scratching against objects',
        'Rapid breathing',
        'Loss of appetite',
        'Clamped fins',
        'Lethargy',
      ],
      causes: [
        'Parasitic infection',
        'Stress from poor water quality',
        'Sudden temperature changes',
        'Introduction of infected fish',
        'Weakened immune system',
      ],
      affectedAreas: ['Body', 'Fins', 'Gills'],
      description: 'Ich is one of the most common freshwater fish diseases caused by a protozoan parasite. It appears as small white spots resembling grains of salt on the fish\'s body and fins.',
      isContagious: true,
      treatments: [
        TreatmentInfo(
          title: 'Heat Treatment',
          type: TreatmentType.environmental,
          priority: TreatmentPriority.high,
          description: 'Gradually raise water temperature to speed up parasite lifecycle',
          steps: [
            'Slowly increase temperature by 2°F every hour',
            'Maintain temperature at 86°F (30°C) for 10 days',
            'Ensure adequate oxygenation during treatment',
            'Monitor fish closely for stress',
          ],
          durationDays: 10,
          precautions: [
            'Not suitable for cold water fish',
            'Increase aeration as warm water holds less oxygen',
            'Monitor ammonia levels',
          ],
        ),
        TreatmentInfo(
          title: 'Medication Treatment',
          type: TreatmentType.medication,
          priority: TreatmentPriority.urgent,
          description: 'Use ich-specific medication for severe cases',
          medication: 'Malachite Green or Copper-based medication',
          dosage: 'Follow manufacturer instructions',
          steps: [
            'Remove carbon from filter',
            'Add medication as directed',
            'Continue treatment for full course',
            'Perform water changes as directed',
          ],
          durationDays: 14,
          precautions: [
            'Remove invertebrates before treatment',
            'Some medications harm beneficial bacteria',
            'Follow dosage carefully',
          ],
        ),
      ],
    ),
    'fin_rot': DiseaseInfo(
      id: 'fin_rot',
      name: 'Fin Rot',
      scientificName: 'Aeromonas, Pseudomonas, or Vibrio bacteria',
      symptoms: [
        'Frayed or ragged fins',
        'White edge on fins',
        'Fins appear to be dissolving',
        'Red or inflamed fin bases',
        'Lethargy',
        'Loss of appetite',
      ],
      causes: [
        'Poor water quality',
        'Bacterial infection',
        'Stress',
        'Overcrowding',
        'Fin nipping by other fish',
        'Low water temperatures',
      ],
      affectedAreas: ['Fins', 'Tail'],
      description: 'Fin rot is a bacterial infection that causes progressive damage to fins and tail. It often starts at the edges and works inward.',
      isContagious: true,
      treatments: [
        TreatmentInfo(
          title: 'Water Quality Improvement',
          type: TreatmentType.waterChange,
          priority: TreatmentPriority.urgent,
          description: 'Improve water conditions to help healing',
          steps: [
            'Perform 25% water change daily',
            'Test and correct water parameters',
            'Remove any decaying matter',
            'Ensure proper filtration',
            'Add aquarium salt (1 tbsp per 5 gallons)',
          ],
          durationDays: 7,
          precautions: [
            'Match temperature when changing water',
            'Use dechlorinated water',
            'Don\'t over-clean and stress fish',
          ],
        ),
        TreatmentInfo(
          title: 'Antibiotic Treatment',
          type: TreatmentType.medication,
          priority: TreatmentPriority.high,
          description: 'Use antibiotics for severe cases',
          medication: 'Kanamycin or Tetracycline',
          dosage: 'Follow package instructions',
          steps: [
            'Isolate affected fish if possible',
            'Remove carbon filtration',
            'Add medication as directed',
            'Complete full treatment course',
          ],
          durationDays: 10,
          precautions: [
            'May harm beneficial bacteria',
            'Complete full course to prevent resistance',
            'Monitor for improvement',
          ],
        ),
      ],
    ),
    'velvet': DiseaseInfo(
      id: 'velvet',
      name: 'Velvet Disease',
      scientificName: 'Piscinoodinium pillulare',
      symptoms: [
        'Gold or rust-colored dust on body',
        'Scratching against objects',
        'Rapid breathing',
        'Clamped fins',
        'Loss of appetite',
        'Lethargy',
        'Film over eyes',
      ],
      causes: [
        'Parasitic dinoflagellate infection',
        'Poor water quality',
        'Stress',
        'Introduction of infected fish',
        'Lack of quarantine',
      ],
      affectedAreas: ['Body', 'Fins', 'Gills'],
      description: 'Velvet disease is caused by a parasitic dinoflagellate that gives fish a dusty, gold appearance. It\'s highly contagious and can be fatal if untreated.',
      isContagious: true,
      treatments: [
        TreatmentInfo(
          title: 'Copper Treatment',
          type: TreatmentType.medication,
          priority: TreatmentPriority.urgent,
          description: 'Use copper-based medication to eliminate parasites',
          medication: 'Copper sulfate',
          dosage: '0.15-0.20 mg/L',
          steps: [
            'Remove invertebrates and live plants',
            'Turn off UV sterilizers',
            'Add copper medication gradually',
            'Test copper levels daily',
            'Maintain therapeutic level for 14 days',
          ],
          durationDays: 14,
          precautions: [
            'Copper is toxic to invertebrates',
            'Test copper levels frequently',
            'Remove with carbon after treatment',
          ],
        ),
        TreatmentInfo(
          title: 'Darkness Treatment',
          type: TreatmentType.environmental,
          priority: TreatmentPriority.medium,
          description: 'Reduce light to inhibit parasite photosynthesis',
          steps: [
            'Cover aquarium to block light',
            'Maintain darkness for 7-10 days',
            'Feed fish sparingly in darkness',
            'Combine with medication for best results',
          ],
          durationDays: 10,
          precautions: [
            'Plants may suffer from lack of light',
            'Monitor water quality closely',
            'Fish may be stressed initially',
          ],
        ),
      ],
    ),
    'dropsy': DiseaseInfo(
      id: 'dropsy',
      name: 'Dropsy',
      scientificName: 'Various bacteria (often Aeromonas)',
      symptoms: [
        'Swollen belly',
        'Scales sticking out (pinecone appearance)',
        'Bulging eyes',
        'Pale gills',
        'Lethargy',
        'Loss of appetite',
        'Stringy feces',
      ],
      causes: [
        'Bacterial infection',
        'Kidney failure',
        'Poor water quality',
        'Stress',
        'Poor diet',
        'Genetic factors',
      ],
      affectedAreas: ['Internal organs', 'Body cavity'],
      description: 'Dropsy is a symptom of severe internal infection causing fluid buildup. The characteristic pinecone appearance occurs when scales stick out due to swelling.',
      isContagious: false,
      treatments: [
        TreatmentInfo(
          title: 'Isolation and Salt Bath',
          type: TreatmentType.quarantine,
          priority: TreatmentPriority.urgent,
          description: 'Isolate fish and provide supportive care',
          steps: [
            'Move fish to hospital tank',
            'Add 1 teaspoon aquarium salt per gallon',
            'Maintain pristine water conditions',
            'Offer high-quality foods',
            'Monitor closely',
          ],
          durationDays: 14,
          precautions: [
            'Dropsy has low survival rate',
            'Early treatment is critical',
            'May need to consider euthanasia',
          ],
        ),
        TreatmentInfo(
          title: 'Antibiotic Treatment',
          type: TreatmentType.medication,
          priority: TreatmentPriority.urgent,
          description: 'Broad-spectrum antibiotics for bacterial infection',
          medication: 'Kanamycin + Nitrofurazone',
          dosage: 'As directed on package',
          steps: [
            'Combine antibiotics in hospital tank',
            'Maintain stable temperature',
            'Perform daily water changes',
            'Continue for full course',
          ],
          durationDays: 10,
          precautions: [
            'Success rate is low once pineconing occurs',
            'Monitor water quality',
            'Be prepared for fish loss',
          ],
        ),
      ],
    ),
    'fungal_infection': DiseaseInfo(
      id: 'fungal_infection',
      name: 'Fungal Infection',
      scientificName: 'Saprolegnia sp.',
      symptoms: [
        'White cotton-like growth',
        'Gray or white patches',
        'Frayed fins',
        'Lethargy',
        'Loss of appetite',
        'Rubbing against objects',
      ],
      causes: [
        'Secondary infection after injury',
        'Poor water quality',
        'Stress',
        'Dead tissue',
        'Uneaten food',
        'Low temperatures',
      ],
      affectedAreas: ['Body', 'Fins', 'Mouth', 'Gills'],
      description: 'Fungal infections appear as cotton-like growths on fish. They often occur as secondary infections on damaged tissue.',
      isContagious: false,
      treatments: [
        TreatmentInfo(
          title: 'Antifungal Medication',
          type: TreatmentType.medication,
          priority: TreatmentPriority.high,
          description: 'Use antifungal medication to treat infection',
          medication: 'Methylene Blue or Malachite Green',
          dosage: 'Follow manufacturer instructions',
          steps: [
            'Remove carbon from filter',
            'Add medication as directed',
            'Increase aeration',
            'Perform water changes as directed',
            'Remove any dead tissue if possible',
          ],
          durationDays: 7,
          precautions: [
            'May stain decorations and silicone',
            'Harmful to live plants',
            'Use half dose for scaleless fish',
          ],
        ),
        TreatmentInfo(
          title: 'Salt Treatment',
          type: TreatmentType.medication,
          priority: TreatmentPriority.medium,
          description: 'Use salt baths for mild cases',
          medication: 'Aquarium salt',
          dosage: '1-3 teaspoons per gallon',
          steps: [
            'Dissolve salt before adding',
            'Add gradually over 24 hours',
            'Maintain for duration of treatment',
            'Remove with water changes',
          ],
          durationDays: 10,
          precautions: [
            'Not suitable for salt-sensitive fish',
            'Monitor fish for stress',
            'Don\'t use table salt',
          ],
        ),
      ],
    ),
  };

  static List<String> commonSymptoms = [
    'White spots',
    'Gold dust appearance',
    'Cotton-like growth',
    'Frayed fins',
    'Swollen body',
    'Pinecone scales',
    'Cloudy eyes',
    'Red streaks',
    'Rapid breathing',
    'Scratching/flashing',
    'Lethargy',
    'Loss of appetite',
    'Clamped fins',
    'Gasping at surface',
    'Unusual swimming',
  ];

  static List<PreventiveMeasure> preventiveMeasures = [
    PreventiveMeasure(
      title: 'Quarantine New Fish',
      description: 'Always quarantine new fish for 2-4 weeks before adding to main tank',
      importance: Importance.critical,
    ),
    PreventiveMeasure(
      title: 'Maintain Water Quality',
      description: 'Regular water changes and parameter monitoring prevent most diseases',
      importance: Importance.critical,
    ),
    PreventiveMeasure(
      title: 'Avoid Overfeeding',
      description: 'Excess food degrades water quality and stresses fish',
      importance: Importance.high,
    ),
    PreventiveMeasure(
      title: 'Proper Stocking',
      description: 'Avoid overcrowding to reduce stress and disease transmission',
      importance: Importance.high,
    ),
    PreventiveMeasure(
      title: 'Varied Diet',
      description: 'Provide high-quality, varied diet to boost immune system',
      importance: Importance.medium,
    ),
    PreventiveMeasure(
      title: 'Stable Environment',
      description: 'Avoid sudden changes in temperature, pH, or other parameters',
      importance: Importance.high,
    ),
  ];
}

class DiseaseInfo {
  final String id;
  final String name;
  final String scientificName;
  final List<String> symptoms;
  final List<String> causes;
  final List<String> affectedAreas;
  final String description;
  final bool isContagious;
  final List<TreatmentInfo> treatments;

  const DiseaseInfo({
    required this.id,
    required this.name,
    required this.scientificName,
    required this.symptoms,
    required this.causes,
    required this.affectedAreas,
    required this.description,
    required this.isContagious,
    required this.treatments,
  });
}

class TreatmentInfo {
  final String title;
  final TreatmentType type;
  final TreatmentPriority priority;
  final String description;
  final List<String> steps;
  final String? medication;
  final String? dosage;
  final int? durationDays;
  final List<String> precautions;

  const TreatmentInfo({
    required this.title,
    required this.type,
    required this.priority,
    required this.description,
    required this.steps,
    this.medication,
    this.dosage,
    this.durationDays,
    required this.precautions,
  });
}

class PreventiveMeasure {
  final String title;
  final String description;
  final Importance importance;

  const PreventiveMeasure({
    required this.title,
    required this.description,
    required this.importance,
  });
}

enum Importance {
  critical('critical', 'Critical'),
  high('high', 'High'),
  medium('medium', 'Medium'),
  low('low', 'Low');

  final String name;
  final String displayName;
  const Importance(this.name, this.displayName);
}
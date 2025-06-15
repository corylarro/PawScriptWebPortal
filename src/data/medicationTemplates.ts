// src/data/medicationTemplates.ts

import { MedicationTemplate, FrequencyOption } from '@/types/discharge';

export const medicationTemplates: MedicationTemplate[] = [
    {
        name: "Carprofen",
        defaultInstructions: "Give with food. Monitor for GI upset."
    },
    {
        name: "Prednisone",
        defaultInstructions: "Give in the morning. Do not stop suddenly without vet guidance."
    },
    {
        name: "Metacam",
        defaultInstructions: "Give with food. Monitor for decreased appetite or vomiting."
    },
    {
        name: "Tramadol",
        defaultInstructions: "May cause drowsiness. Give with or without food."
    },
    {
        name: "Cephalexin",
        defaultInstructions: "Complete entire course even if symptoms improve. Give with food."
    },
    {
        name: "Gabapentin",
        defaultInstructions: "May cause sedation initially. Do not stop suddenly."
    },
    {
        name: "Onsior",
        defaultInstructions: "Give with food. Monitor for decreased appetite."
    },
    {
        name: "Rimadyl",
        defaultInstructions: "Give with food. Watch for loss of appetite, vomiting, or diarrhea."
    },
    {
        name: "Methocarbamol",
        defaultInstructions: "May cause drowsiness. Give with or without food."
    },
    {
        name: "Amoxicillin",
        defaultInstructions: "Complete entire course. Give with or without food."
    }
];

export const frequencyOptions: FrequencyOption[] = [
    // Common frequencies
    {
        value: 1,
        label: "SID – Once daily",
        abbreviation: "SID",
        times: ["08:00"],
        category: "common"
    },
    {
        value: 2,
        label: "BID – Twice daily",
        abbreviation: "BID",
        times: ["08:00", "20:00"],
        category: "common"
    },
    {
        value: 3,
        label: "TID – Three times daily",
        abbreviation: "TID",
        times: ["08:00", "14:00", "20:00"],
        category: "common"
    },
    {
        value: 4,
        label: "QID – Four times daily",
        abbreviation: "QID",
        times: ["08:00", "12:00", "16:00", "20:00"],
        category: "common"
    },
    // Other frequencies
    {
        value: 0.5,
        label: "EOD – Every other day",
        abbreviation: "EOD",
        times: ["08:00"],
        category: "other"
    },
    {
        value: -1,
        label: "PRN – As needed",
        abbreviation: "PRN",
        times: [],
        category: "other"
    },
    {
        value: -8,
        label: "q8h – Every 8 hours",
        abbreviation: "q8h",
        times: ["08:00", "16:00", "00:00"],
        category: "other"
    },
    {
        value: -12,
        label: "q12h – Every 12 hours",
        abbreviation: "q12h",
        times: ["08:00", "20:00"],
        category: "other"
    },
    {
        value: -99,
        label: "Custom – Enter manually",
        abbreviation: "Custom",
        times: [],
        category: "other"
    }
];

// Helper function to get frequency option by value
export const getFrequencyOption = (frequency: number): FrequencyOption | undefined => {
    return frequencyOptions.find(option => option.value === frequency);
};

// Helper function to get medication template by name
export const getMedicationTemplate = (name: string): MedicationTemplate | undefined => {
    return medicationTemplates.find(template =>
        template.name.toLowerCase() === name.toLowerCase()
    );
};
// scripts/setupDemoData.js
// Demo data population script for PawScript web portal
// Run with: node scripts/setupDemoData.js

// eslint-disable-next-line @typescript-eslint/no-require-imports
const admin = require('firebase-admin');

// Initialize Firebase Admin (you'll need to set up service account)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const serviceAccount = require('../scripts/serviceAccountKey.json'); // You'll need this file
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Demo account constants
const DEMO_VET_UID = 'UJfbjrqum1RiZxsz4s8OrNlN2mR2';
const DEMO_EMAIL = 'demo@pawscript.com';

// Collection names
const COLLECTIONS = {
    CLINICS: 'clinics',
    VET_USERS: 'vetUsers',
    CLIENTS: 'clients',
    PETS: 'pets',
    DISCHARGES: 'discharges'
};

// Helper function to create realistic timestamps
function createTimestamp(daysAgo, hourOffset = 0) {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    date.setHours(8 + hourOffset, 0, 0, 0); // Start at 8 AM + offset
    return admin.firestore.Timestamp.fromDate(date);
}

// Helper function to get date strings for medications (YYYY-MM-DD format)
function getDateString(daysAgo) {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split('T')[0];
}

// Helper function to create random time variations (for realistic adherence)
function addTimeVariation(baseTime, maxMinutes = 30) {
    const variation = Math.floor(Math.random() * maxMinutes * 2) - maxMinutes;
    const newTime = new Date(baseTime.toDate());
    newTime.setMinutes(newTime.getMinutes() + variation);
    return admin.firestore.Timestamp.fromDate(newTime);
}

async function setupDemoEnvironment() {
    console.log('🚀 Starting demo data population...');
    console.log(`📅 Today's date: ${new Date().toISOString().split('T')[0]}`);

    try {
        // Step 1: Create demo clinic
        const demoClinicId = await createDemoClinic();
        console.log('✅ Demo clinic created:', demoClinicId);

        // Step 2: Create demo vet user
        await createDemoVetUser(demoClinicId);
        console.log('✅ Demo vet user created');

        // Step 3: Create demo clients
        const bellaClientId = await createBellaClient(demoClinicId);
        const maxClientId = await createMaxClient(demoClinicId);
        const lunaClientId = await createLunaClient(demoClinicId);
        const charlieClientId = await createCharlieClient(demoClinicId);
        const mochiClientId = await createMochiClient(demoClinicId);
        console.log('✅ Demo clients created');

        // Step 4: Create demo pets
        const bellaInfo = await createBellaPet(bellaClientId, demoClinicId);
        const maxInfo = await createMaxPet(maxClientId, demoClinicId);
        const lunaInfo = await createLunaPet(lunaClientId, demoClinicId);
        const charlieInfo = await createCharliePet(charlieClientId, demoClinicId);
        const mochiInfo = await createMochiPet(mochiClientId, demoClinicId);
        console.log('✅ Demo pets created');

        // Step 5: Create discharge records with medications and adherence
        await createBellaDischarges(bellaInfo, demoClinicId);
        await createMaxDischarges(maxInfo, demoClinicId);
        await createLunaDischarges(lunaInfo, demoClinicId);
        await createCharlieDischarges(charlieInfo, demoClinicId);
        await createMochiDischarges(mochiInfo, demoClinicId);
        console.log('✅ Demo discharges and adherence data created');

        console.log('🎉 Demo environment setup complete!');
        console.log(`Login with: ${DEMO_EMAIL}`);
        console.log('');
        console.log('📊 Demo Patients Created:');
        console.log('🐕 Bella (Golden Retriever) - Excellent adherence (95%+), currently on allergy meds');
        console.log('🐕 Max (German Shepherd) - Poor adherence (45%), concerning heart patient');
        console.log('🐱 Luna (Domestic Cat) - Good adherence (78%), every-other-day steroid + high symptom tracking');
        console.log('🐕 Charlie (Mixed Breed) - Historical patient, early discontinuation example, multiple completed treatments');
        console.log('🐱 Mochi (Persian Cat) - Inactive patient, completed treatment successfully, no current meds');
        console.log('');
        console.log('🎯 Features Demonstrated:');
        console.log('✅ Excellent, good, poor, and concerning adherence patterns');
        console.log('✅ Every-other-day (EOD) medication scheduling');
        console.log('✅ Early medication discontinuation due to side effects');
        console.log('✅ Tapered medication schedules');
        console.log('✅ Active and inactive patient states');
        console.log('✅ Multiple species (dogs and cats)');
        console.log('✅ Rich symptom tracking patterns');
        console.log('✅ Historical patient data across multiple visits');

    } catch (error) {
        console.error('❌ Error setting up demo environment:', error);
        throw error;
    }
}

async function createDemoClinic() {
    const clinicId = `demo-clinic-${Date.now()}`;
    const clinicData = {
        name: 'PawScript Demo Veterinary Clinic',
        address: {
            street: '123 Demo Street',
            city: 'Veterinary City',
            state: 'CA',
            zipCode: '90210'
        },
        phone: '(555) 123-DEMO',
        email: 'clinic@pawscript-demo.com',
        licenseNumber: 'DEMO-VET-2025',
        createdAt: createTimestamp(180), // 6 months ago
        updatedAt: createTimestamp(0)
    };

    await db.collection(COLLECTIONS.CLINICS).doc(clinicId).set(clinicData);
    return clinicId;
}

async function createDemoVetUser(clinicId) {
    const vetUserData = {
        email: DEMO_EMAIL,
        firstName: 'Demo',
        lastName: 'Veterinarian',
        clinicId: clinicId,
        role: 'admin',
        createdAt: createTimestamp(180),
        updatedAt: createTimestamp(0)
    };

    await db.collection(COLLECTIONS.VET_USERS).doc(DEMO_VET_UID).set(vetUserData);
}

async function createBellaClient(clinicId) {
    const clientId = `bella-client-${Date.now()}`;
    const clientData = {
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah.johnson.demo@email.com',
        phone: '(555) 234-5678',
        address: {
            street: '456 Oak Avenue',
            city: 'Pet Town',
            state: 'CA',
            zipCode: '90211'
        },
        clinicId: clinicId,
        isActive: true,
        createdAt: createTimestamp(180),
        updatedAt: createTimestamp(30),
        notes: 'Very compliant pet owner. Always follows medication instructions carefully.'
    };

    await db.collection(COLLECTIONS.CLIENTS).doc(clientId).set(clientData);
    return clientId;
}

async function createMaxClient(clinicId) {
    const clientId = `max-client-${Date.now()}`;
    const clientData = {
        firstName: 'Mike',
        lastName: 'Rodriguez',
        email: 'mike.rodriguez.demo@email.com',
        phone: '(555) 345-6789',
        address: {
            street: '789 Pine Street',
            city: 'Pet Town',
            state: 'CA',
            zipCode: '90212'
        },
        clinicId: clinicId,
        isActive: true,
        createdAt: createTimestamp(120),
        updatedAt: createTimestamp(45),
        notes: 'Busy schedule. May need medication reminders and adherence support.'
    };

    await db.collection(COLLECTIONS.CLIENTS).doc(clientId).set(clientData);
    return clientId;
}

async function createLunaClient(clinicId) {
    const clientId = `luna-client-${Date.now()}`;
    const clientData = {
        firstName: 'Jennifer',
        lastName: 'Chen',
        email: 'jennifer.chen.demo@email.com',
        phone: '(555) 456-7890',
        address: {
            street: '321 Maple Lane',
            city: 'Pet Town',
            state: 'CA',
            zipCode: '90213'
        },
        clinicId: clinicId,
        isActive: true,
        createdAt: createTimestamp(90),
        updatedAt: createTimestamp(10),
        notes: 'Very observant pet owner. Excellent at tracking symptoms and behavior changes.'
    };

    await db.collection(COLLECTIONS.CLIENTS).doc(clientId).set(clientData);
    return clientId;
}

async function createCharlieClient(clinicId) {
    const clientId = `charlie-client-${Date.now()}`;
    const clientData = {
        firstName: 'David',
        lastName: 'Thompson',
        email: 'david.thompson.demo@email.com',
        phone: '(555) 567-8901',
        address: {
            street: '654 Elm Drive',
            city: 'Pet Town',
            state: 'CA',
            zipCode: '90214'
        },
        clinicId: clinicId,
        isActive: true,
        createdAt: createTimestamp(150),
        updatedAt: createTimestamp(20),
        notes: 'Long-term client with senior dog. Understands medication management well.'
    };

    await db.collection(COLLECTIONS.CLIENTS).doc(clientId).set(clientData);
    return clientId;
}

async function createMochiClient(clinicId) {
    const clientId = `mochi-client-${Date.now()}`;
    const clientData = {
        firstName: 'Lisa',
        lastName: 'Park',
        email: 'lisa.park.demo@email.com',
        phone: '(555) 678-9012',
        address: {
            street: '987 Birch Street',
            city: 'Pet Town',
            state: 'CA',
            zipCode: '90215'
        },
        clinicId: clinicId,
        isActive: true,
        createdAt: createTimestamp(200),
        updatedAt: createTimestamp(35),
        notes: 'Excellent cat owner. Very attentive to health changes and medication schedules.'
    };

    await db.collection(COLLECTIONS.CLIENTS).doc(clientId).set(clientData);
    return clientId;
}

async function createBellaPet(clientId, clinicId) {
    const petId = `bella-${Date.now()}`;
    const petData = {
        name: 'Bella',
        species: 'Dog',
        breed: 'Golden Retriever',
        weight: '65 lbs',
        ageAtCreation: 84, // 7 years in months
        ageAsOfDate: createTimestamp(0),
        clientId: clientId,
        clinicId: clinicId,
        isActive: true,
        createdAt: createTimestamp(180),
        updatedAt: createTimestamp(30),
        notes: 'Sweet, energetic Golden. Responds well to treatment.'
    };

    await db.collection(COLLECTIONS.PETS).doc(petId).set(petData);
    return { id: petId, name: 'Bella', species: 'Dog' };
}

async function createMaxPet(clientId, clinicId) {
    const petId = `max-${Date.now()}`;
    const petData = {
        name: 'Max',
        species: 'Dog',
        breed: 'German Shepherd',
        weight: '85 lbs',
        ageAtCreation: 108, // 9 years in months
        ageAsOfDate: createTimestamp(0),
        clientId: clientId,
        clinicId: clinicId,
        isActive: true,
        createdAt: createTimestamp(120),
        updatedAt: createTimestamp(45),
        notes: 'Senior dog with heart condition. Requires consistent medication.'
    };

    await db.collection(COLLECTIONS.PETS).doc(petId).set(petData);
    return { id: petId, name: 'Max', species: 'Dog' };
}

async function createLunaPet(clientId, clinicId) {
    const petId = `luna-${Date.now()}`;
    const petData = {
        name: 'Luna',
        species: 'Cat',
        breed: 'Domestic Shorthair',
        weight: '12 lbs',
        ageAtCreation: 48, // 4 years in months
        ageAsOfDate: createTimestamp(0),
        clientId: clientId,
        clinicId: clinicId,
        isActive: true,
        createdAt: createTimestamp(90),
        updatedAt: createTimestamp(10),
        notes: 'Indoor cat with seasonal allergies. Prone to stress-related symptoms.'
    };

    await db.collection(COLLECTIONS.PETS).doc(petId).set(petData);
    return { id: petId, name: 'Luna', species: 'Cat' };
}

async function createCharliePet(clientId, clinicId) {
    const petId = `charlie-${Date.now()}`;
    const petData = {
        name: 'Charlie',
        species: 'Dog',
        breed: 'Mixed Breed',
        weight: '45 lbs',
        ageAtCreation: 120, // 10 years in months
        ageAsOfDate: createTimestamp(0),
        clientId: clientId,
        clinicId: clinicId,
        isActive: true,
        createdAt: createTimestamp(150),
        updatedAt: createTimestamp(20),
        notes: 'Senior mixed breed. History of skin allergies and occasional digestive issues.'
    };

    await db.collection(COLLECTIONS.PETS).doc(petId).set(petData);
    return { id: petId, name: 'Charlie', species: 'Dog' };
}

async function createMochiPet(clientId, clinicId) {
    const petId = `mochi-${Date.now()}`;
    const petData = {
        name: 'Mochi',
        species: 'Cat',
        breed: 'Persian',
        weight: '9 lbs',
        ageAtCreation: 36, // 3 years in months
        ageAsOfDate: createTimestamp(0),
        clientId: clientId,
        clinicId: clinicId,
        isActive: true,
        createdAt: createTimestamp(200),
        updatedAt: createTimestamp(35),
        notes: 'Well-cared-for Persian. Generally healthy with good treatment compliance.'
    };

    await db.collection(COLLECTIONS.PETS).doc(petId).set(petData);
    return { id: petId, name: 'Mochi', species: 'Cat' };
}

async function createBellaDischarges(petInfo, clinicId) {
    // Visit 1: Post-Surgery Recovery (COMPLETED - 60 days ago)
    const visit1Id = await createDischarge({
        petInfo: {
            petId: petInfo.id,
            name: petInfo.name,
            species: petInfo.species,
            weight: '65 lbs'
        },
        clinicId,
        visitDate: createTimestamp(60),
        diagnosis: 'Post-operative care following ACL repair',
        notes: 'Surgery went well. Monitor for swelling and ensure rest. Follow medication schedule strictly.',
        medications: [
            {
                medId: `med_${Date.now()}_carprofen100`,
                name: 'Carprofen 100mg',
                dosage: '100mg',
                frequency: 2,
                times: ['08:00', '20:00'],
                startDate: getDateString(60), // 60 days ago
                endDate: getDateString(46),   // 46 days ago (completed)
                instructions: 'Give with food to prevent stomach upset',
                allowClientToAdjustTime: false,
                isTapered: false,
                taperStages: [],
                totalDoses: 28
            },
            {
                medId: `med_${Date.now()}_tramadol50`,
                name: 'Tramadol 50mg',
                dosage: '50mg',
                frequency: 3,
                times: ['08:00', '14:00', '20:00'],
                startDate: getDateString(60), // 60 days ago
                endDate: getDateString(53),   // 53 days ago (completed)
                instructions: 'May cause drowsiness. Monitor for excessive sedation',
                allowClientToAdjustTime: false,
                isTapered: false,
                taperStages: [],
                totalDoses: 21
            }
        ]
    });

    // Generate adherence data for Visit 1 (excellent adherence - completed)
    await generateBellaAdherence(visit1Id);

    // Visit 2: Arthritis Management (COMPLETED - 45 days ago)
    const visit2Id = await createDischarge({
        petInfo: {
            petId: petInfo.id,
            name: petInfo.name,
            species: petInfo.species,
            weight: '65 lbs'
        },
        clinicId,
        visitDate: createTimestamp(45),
        diagnosis: 'Osteoarthritis, bilateral hips',
        notes: 'Joint changes consistent with age. Long-term management plan discussed.',
        medications: [
            {
                medId: `med_${Date.now()}_carprofen75`,
                name: 'Carprofen 75mg',
                dosage: '75mg',
                frequency: 2,
                times: ['07:30', '19:30'],
                startDate: getDateString(45), // 45 days ago
                endDate: getDateString(15),   // 15 days ago (completed)
                instructions: 'Give with meals. Monitor for gastrointestinal upset',
                allowClientToAdjustTime: true,
                isTapered: false,
                taperStages: [],
                totalDoses: 60
            }
        ]
    });

    await generateBellaAdherence(visit2Id);

    // Visit 3: Skin Allergy Treatment (ACTIVE - started 20 days ago)
    const visit3Id = await createDischarge({
        petInfo: {
            petId: petInfo.id,
            name: petInfo.name,
            species: petInfo.species,
            weight: '65 lbs'
        },
        clinicId,
        visitDate: createTimestamp(20),
        diagnosis: 'Seasonal allergic dermatitis',
        notes: 'Skin irritation and scratching. Tapered dosing for optimal control.',
        medications: [
            {
                medId: `med_${Date.now()}_apoquel16`,
                name: 'Apoquel 16mg',
                dosage: '16mg',
                frequency: 2, // Initial frequency
                times: ['08:00', '20:00'],
                startDate: getDateString(20), // 20 days ago
                endDate: getDateString(-30),  // 30 days in future (ongoing)
                instructions: 'Can be given with or without food',
                allowClientToAdjustTime: true,
                isTapered: true,
                taperStages: [
                    {
                        startDate: getDateString(20), // 20 days ago
                        endDate: getDateString(6),    // 6 days ago
                        dosage: '16mg',
                        frequency: 2,
                        times: ['08:00', '20:00'],
                        totalDoses: 28
                    },
                    {
                        startDate: getDateString(5),   // 5 days ago  
                        endDate: getDateString(-30),   // 30 days in future
                        dosage: '16mg',
                        frequency: 1,
                        times: ['08:00'],
                        totalDoses: 76
                    }
                ],
                totalDoses: 104
            }
        ]
    });

    await generateBellaAdherence(visit3Id);
}

async function createMaxDischarges(petInfo, clinicId) {
    // Visit 1: Heart Condition Management (COMPLETED - 90 days ago)
    const visit1Id = await createDischarge({
        petInfo: {
            petId: petInfo.id,
            name: petInfo.name,
            species: petInfo.species,
            weight: '85 lbs'
        },
        clinicId,
        visitDate: createTimestamp(90),
        diagnosis: 'Mild congestive heart failure',
        notes: 'Early stage CHF. Critical to maintain consistent medication schedule. Monitor for worsening symptoms.',
        medications: [
            {
                medId: `med_${Date.now()}_enalapril10_1`,
                name: 'Enalapril 10mg',
                dosage: '10mg',
                frequency: 2,
                times: ['08:00', '20:00'],
                startDate: getDateString(90), // 90 days ago
                endDate: getDateString(30),   // 30 days ago (completed)
                instructions: 'Monitor for signs of kidney issues. Give consistently at same times',
                allowClientToAdjustTime: false,
                isTapered: false,
                taperStages: [],
                totalDoses: 120
            }
        ]
    });

    await generateMaxAdherence(visit1Id, 'poor');

    // Visit 2: Ongoing Heart + Joint Issues (ACTIVE - started 25 days ago)
    const visit2Id = await createDischarge({
        petInfo: {
            petId: petInfo.id,
            name: petInfo.name,
            species: petInfo.species,
            weight: '85 lbs'
        },
        clinicId,
        visitDate: createTimestamp(25),
        diagnosis: 'CHF monitoring + degenerative joint disease',
        notes: 'Heart condition stable but requires strict medication compliance. Added joint support.',
        medications: [
            {
                medId: `med_${Date.now()}_enalapril10_2`,
                name: 'Enalapril 10mg',
                dosage: '10mg',
                frequency: 2,
                times: ['08:00', '20:00'],
                startDate: getDateString(25), // 25 days ago
                endDate: null, // Ongoing
                instructions: 'Critical for heart function - do not skip doses',
                allowClientToAdjustTime: false,
                isTapered: false,
                taperStages: [],
                totalDoses: null // Ongoing
            },
            {
                medId: `med_${Date.now()}_galliprant100`,
                name: 'Galliprant 100mg',
                dosage: '100mg',
                frequency: 1,
                times: ['08:00'],
                startDate: getDateString(25), // 25 days ago
                endDate: getDateString(-5),   // 5 days in future (short course)
                instructions: 'Give with food. Watch for decreased appetite',
                allowClientToAdjustTime: true,
                isTapered: false,
                taperStages: [],
                totalDoses: 30
            }
        ]
    });

    await generateMaxAdherence(visit2Id, 'concerning');
}

async function createLunaDischarges(petInfo, clinicId) {
    // Visit 1: IBD Flare-up (COMPLETED - 35 days ago)
    const visit1Id = await createDischarge({
        petInfo: {
            petId: petInfo.id,
            name: petInfo.name,
            species: petInfo.species,
            weight: '12 lbs'
        },
        clinicId,
        visitDate: createTimestamp(35),
        diagnosis: 'Inflammatory bowel disease flare-up',
        notes: 'Stress-related IBD episode. Owner reports good symptom tracking and medication compliance.',
        medications: [
            {
                medId: `med_${Date.now()}_prednisolone`,
                name: 'Prednisolone 5mg',
                dosage: '5mg',
                frequency: 1,
                times: ['08:00'],
                startDate: getDateString(35), // 35 days ago
                endDate: getDateString(15),   // 15 days ago (completed)
                instructions: 'Give with food. Watch for increased thirst and urination',
                allowClientToAdjustTime: true,
                isTapered: false,
                taperStages: [],
                totalDoses: 20
            }
        ]
    });

    await generateLunaAdherence(visit1Id, 'good');

    // Visit 2: Allergy Management (ACTIVE - EOD medication started 18 days ago)
    const visit2Id = await createDischarge({
        petInfo: {
            petId: petInfo.id,
            name: petInfo.name,
            species: petInfo.species,
            weight: '12 lbs'
        },
        clinicId,
        visitDate: createTimestamp(18),
        diagnosis: 'Seasonal allergic dermatitis',
        notes: 'Every-other-day steroid protocol for maintenance. Owner excellent at symptom monitoring.',
        medications: [
            {
                medId: `med_${Date.now()}_prednisolone_eod`,
                name: 'Prednisolone 2.5mg',
                dosage: '2.5mg',
                frequency: 1,
                times: ['08:00'],
                startDate: getDateString(18), // 18 days ago
                endDate: getDateString(-14),  // 14 days in future
                instructions: 'Give every other day only. Mark calendar to track EOD schedule',
                allowClientToAdjustTime: true,
                isTapered: false,
                taperStages: [],
                isEveryOtherDay: true,
                totalDoses: 16
            }
        ]
    });

    await generateLunaAdherence(visit2Id, 'good');
}

async function createCharlieDischarges(petInfo, clinicId) {
    // Visit 1: Skin Infection (COMPLETED - with early discontinuation)
    const visit1Id = await createDischarge({
        petInfo: {
            petId: petInfo.id,
            name: petInfo.name,
            species: petInfo.species,
            weight: '45 lbs'
        },
        clinicId,
        visitDate: createTimestamp(75),
        diagnosis: 'Bacterial skin infection',
        notes: 'Antibiotic discontinued early due to GI upset. Switched to topical treatment.',
        medications: [
            {
                medId: `med_${Date.now()}_cephalexin`,
                name: 'Cephalexin 500mg',
                dosage: '500mg',
                frequency: 2,
                times: ['08:00', '20:00'],
                startDate: getDateString(75), // 75 days ago
                endDate: getDateString(68),   // Stopped after 7 days (was prescribed for 14)
                instructions: 'Give with food. Complete full course unless side effects occur',
                allowClientToAdjustTime: false,
                isTapered: false,
                taperStages: [],
                totalDoses: 14 // Stopped early - only 7 days instead of 14
            }
        ]
    });

    await generateCharlieAdherence(visit1Id, 'discontinued');

    // Visit 2: Arthritis Management (COMPLETED - 40 days ago)
    const visit2Id = await createDischarge({
        petInfo: {
            petId: petInfo.id,
            name: petInfo.name,
            species: petInfo.species,
            weight: '45 lbs'
        },
        clinicId,
        visitDate: createTimestamp(40),
        diagnosis: 'Osteoarthritis, multiple joints',
        notes: 'Senior dog joint management. Good response to treatment over 30-day course.',
        medications: [
            {
                medId: `med_${Date.now()}_carprofen_charlie`,
                name: 'Carprofen 50mg',
                dosage: '50mg',
                frequency: 2,
                times: ['07:00', '19:00'],
                startDate: getDateString(40), // 40 days ago
                endDate: getDateString(10),   // 10 days ago (completed)
                instructions: 'Give with meals. Monitor for appetite changes',
                allowClientToAdjustTime: true,
                isTapered: false,
                taperStages: [],
                totalDoses: 60
            }
        ]
    });

    await generateCharlieAdherence(visit2Id, 'excellent');

    // Visit 3: Dental Cleaning Post-op (COMPLETED - 25 days ago)
    const visit3Id = await createDischarge({
        petInfo: {
            petId: petInfo.id,
            name: petInfo.name,
            species: petInfo.species,
            weight: '45 lbs'
        },
        clinicId,
        visitDate: createTimestamp(25),
        diagnosis: 'Post-dental cleaning care',
        notes: 'Routine dental cleaning. Short course of pain management and antibiotics.',
        medications: [
            {
                medId: `med_${Date.now()}_tramadol_charlie`,
                name: 'Tramadol 50mg',
                dosage: '50mg',
                frequency: 2,
                times: ['08:00', '20:00'],
                startDate: getDateString(25), // 25 days ago
                endDate: getDateString(20),   // 20 days ago (completed)
                instructions: 'For pain management. May cause mild sedation',
                allowClientToAdjustTime: false,
                isTapered: false,
                taperStages: [],
                totalDoses: 10
            },
            {
                medId: `med_${Date.now()}_amoxicillin`,
                name: 'Amoxicillin 250mg',
                dosage: '250mg',
                frequency: 2,
                times: ['08:00', '20:00'],
                startDate: getDateString(25), // 25 days ago
                instructions: 'Complete full course. Give with food if stomach upset occurs',
                allowClientToAdjustTime: false,
                isTapered: false,
                taperStages: [],
                totalDoses: 14
            }
        ]
    });

    await generateCharlieAdherence(visit3Id, 'excellent');
}

async function createMochiDischarges(petInfo, clinicId) {
    // Visit 1: URI Treatment (COMPLETED - 50 days ago)
    const visit1Id = await createDischarge({
        petInfo: {
            petId: petInfo.id,
            name: petInfo.name,
            species: petInfo.species,
            weight: '9 lbs'
        },
        clinicId,
        visitDate: createTimestamp(50),
        diagnosis: 'Upper respiratory infection',
        notes: 'Successful treatment of URI. Owner excellent compliance, cat recovered fully.',
        medications: [
            {
                medId: `med_${Date.now()}_doxycycline`,
                name: 'Doxycycline 25mg',
                dosage: '25mg',
                frequency: 2,
                times: ['08:00', '20:00'],
                startDate: getDateString(50), // 50 days ago
                endDate: getDateString(36),   // 36 days ago (completed)
                instructions: 'Give with small amount of food. Ensure adequate water intake',
                allowClientToAdjustTime: true,
                isTapered: false,
                taperStages: [],
                totalDoses: 28
            }
        ]
    });

    await generateMochiAdherence(visit1Id, 'excellent');

    // No current medications - Mochi is healthy and off treatment
    console.log('Mochi has no current medications - healthy and inactive patient');
}

async function createDischarge(data) {
    const dischargeId = `discharge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const dischargeData = {
        pet: data.petInfo,
        medications: data.medications,
        notes: data.notes,
        visitDate: data.visitDate,
        diagnosis: data.diagnosis,
        createdAt: data.visitDate,
        updatedAt: data.visitDate,
        vetId: DEMO_VET_UID,
        clinicId: data.clinicId
    };

    await db.collection(COLLECTIONS.DISCHARGES).doc(dischargeId).set(dischargeData);
    return dischargeId;
}

async function generateBellaAdherence(dischargeId) {
    // Bella has excellent compliance - 95%+ with minor realistic gaps
    console.log(`Generating excellent adherence pattern for discharge ${dischargeId}`);

    const discharge = await db.collection(COLLECTIONS.DISCHARGES).doc(dischargeId).get();
    const medications = discharge.data().medications;

    let totalRecords = 0;

    for (const medication of medications) {
        if (medication.isTapered) {
            totalRecords += await generateTaperedAdherence(dischargeId, medication, 'excellent', 'Bella');
        } else {
            totalRecords += await generateStandardAdherence(dischargeId, medication, 'excellent', 'Bella');
        }
    }

    console.log(`Generated ${totalRecords} adherence records for Bella`);
}

async function generateMaxAdherence(dischargeId, pattern) {
    // Max has poor compliance - 45% with concerning gaps
    console.log(`Generating ${pattern} adherence pattern for discharge ${dischargeId}`);

    const discharge = await db.collection(COLLECTIONS.DISCHARGES).doc(dischargeId).get();
    const medications = discharge.data().medications;

    let totalRecords = 0;

    for (const medication of medications) {
        totalRecords += await generateStandardAdherence(dischargeId, medication, pattern, 'Max');
    }

    console.log(`Generated ${totalRecords} adherence records for Max`);
}

async function generateLunaAdherence(dischargeId, pattern) {
    // Luna has good compliance - 78% with frequent symptom logging
    console.log(`Generating ${pattern} adherence pattern for discharge ${dischargeId}`);

    const discharge = await db.collection(COLLECTIONS.DISCHARGES).doc(dischargeId).get();
    const medications = discharge.data().medications;

    let totalRecords = 0;

    for (const medication of medications) {
        if (medication.isEveryOtherDay) {
            totalRecords += await generateEODAdherence(dischargeId, medication, pattern, 'Luna');
        } else {
            totalRecords += await generateStandardAdherence(dischargeId, medication, pattern, 'Luna');
        }
    }

    console.log(`Generated ${totalRecords} adherence records for Luna`);
}

async function generateCharlieAdherence(dischargeId, pattern) {
    // Charlie has varied patterns - excellent when not discontinued
    console.log(`Generating ${pattern} adherence pattern for discharge ${dischargeId}`);

    const discharge = await db.collection(COLLECTIONS.DISCHARGES).doc(dischargeId).get();
    const medications = discharge.data().medications;

    let totalRecords = 0;

    for (const medication of medications) {
        totalRecords += await generateStandardAdherence(dischargeId, medication, pattern, 'Charlie');
    }

    console.log(`Generated ${totalRecords} adherence records for Charlie`);
}

async function generateMochiAdherence(dischargeId, pattern) {
    // Mochi has excellent compliance 
    console.log(`Generating ${pattern} adherence pattern for discharge ${dischargeId}`);

    const discharge = await db.collection(COLLECTIONS.DISCHARGES).doc(dischargeId).get();
    const medications = discharge.data().medications;

    let totalRecords = 0;

    for (const medication of medications) {
        totalRecords += await generateStandardAdherence(dischargeId, medication, pattern, 'Mochi');
    }

    console.log(`Generated ${totalRecords} adherence records for Mochi`);
}

async function generateStandardAdherence(dischargeId, medication, pattern, petName) {
    let batch = db.batch();
    let recordCount = 0;

    const startDate = new Date(medication.startDate);
    const endDate = medication.endDate ? new Date(medication.endDate) : new Date();

    // Generate daily doses
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        for (let timeIndex = 0; timeIndex < medication.frequency; timeIndex++) {
            const scheduledTime = new Date(date);
            const [hours, minutes] = medication.times[timeIndex].split(':');
            scheduledTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

            // Skip future dates
            if (scheduledTime > new Date()) break;

            const adherenceRecord = generateSingleDoseRecord(
                medication,
                scheduledTime,
                pattern,
                recordCount,
                petName
            );

            const recordId = `${dischargeId}-${medication.name.replace(/\s+/g, '-')}-${date.toISOString().split('T')[0]}-${timeIndex}`;
            const recordRef = db.collection(COLLECTIONS.DISCHARGES)
                .doc(dischargeId)
                .collection('adherence')
                .doc(recordId);

            batch.set(recordRef, adherenceRecord);
            recordCount++;

            // Commit in batches of 450 to stay under Firestore limits
            if (recordCount % 450 === 0) {
                await batch.commit();
                batch = db.batch(); // Create new batch after commit
            }
        }
    }

    // Commit remaining records
    if (recordCount % 450 !== 0) {
        await batch.commit();
    }

    return recordCount;
}

async function generateTaperedAdherence(dischargeId, medication, pattern, petName) {
    let batch = db.batch();
    let recordCount = 0;

    for (const stage of medication.taperStages) {
        const startDate = new Date(stage.startDate);
        const endDate = new Date(stage.endDate);

        for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
            for (let timeIndex = 0; timeIndex < stage.frequency; timeIndex++) {
                const scheduledTime = new Date(date);
                const [hours, minutes] = stage.times[timeIndex].split(':');
                scheduledTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

                // Skip future dates
                if (scheduledTime > new Date()) break;

                const adherenceRecord = generateSingleDoseRecord(
                    { ...medication, dosage: stage.dosage, frequency: stage.frequency },
                    scheduledTime,
                    pattern,
                    recordCount,
                    petName
                );

                const recordId = `${dischargeId}-${medication.name.replace(/\s+/g, '-')}-${date.toISOString().split('T')[0]}-${timeIndex}`;
                const recordRef = db.collection(COLLECTIONS.DISCHARGES)
                    .doc(dischargeId)
                    .collection('adherence')
                    .doc(recordId);

                batch.set(recordRef, adherenceRecord);
                recordCount++;

                if (recordCount % 450 === 0) {
                    await batch.commit();
                    batch = db.batch(); // Create new batch after commit
                }
            }
        }
    }

    if (recordCount % 450 !== 0) {
        await batch.commit();
    }

    return recordCount;
}

async function generateEODAdherence(dischargeId, medication, pattern, petName) {
    // Special function for every-other-day medications
    let batch = db.batch();
    let recordCount = 0;

    const startDate = new Date(medication.startDate);
    const endDate = medication.endDate ? new Date(medication.endDate) : new Date();

    // Generate EOD doses (every other day)
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 2)) { // +2 for every other day
        for (let timeIndex = 0; timeIndex < medication.frequency; timeIndex++) {
            const scheduledTime = new Date(date);
            const [hours, minutes] = medication.times[timeIndex].split(':');
            scheduledTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

            // Skip future dates
            if (scheduledTime > new Date()) break;

            const adherenceRecord = generateSingleDoseRecord(
                medication,
                scheduledTime,
                pattern,
                recordCount,
                petName
            );

            const recordId = `${dischargeId}-${medication.name.replace(/\s+/g, '-')}-${date.toISOString().split('T')[0]}-${timeIndex}`;
            const recordRef = db.collection(COLLECTIONS.DISCHARGES)
                .doc(dischargeId)
                .collection('adherence')
                .doc(recordId);

            batch.set(recordRef, adherenceRecord);
            recordCount++;

            // Commit in batches of 450 to stay under Firestore limits
            if (recordCount % 450 === 0) {
                await batch.commit();
                batch = db.batch(); // Create new batch after commit
            }
        }
    }

    // Commit remaining records
    if (recordCount % 450 !== 0) {
        await batch.commit();
    }

    return recordCount;
}

function generateSingleDoseRecord(medication, scheduledTime, pattern, doseIndex, petName) {
    const isGiven = determineIfDoseGiven(pattern, doseIndex);
    const status = isGiven ? 'given' : (Math.random() < 0.8 ? 'missed' : 'skipped');

    const record = {
        medicationId: medication.medId || `med-${medication.name.replace(/\s+/g, '-').toLowerCase()}`,
        medicationName: medication.name,
        petName: petName,
        scheduledTime: admin.firestore.Timestamp.fromDate(scheduledTime),
        status: status,
        dosage: medication.dosage,
        frequency: medication.frequency,
        instructions: medication.instructions,
        loggedAt: admin.firestore.Timestamp.fromDate(new Date())
    };

    if (status === 'given') {
        // Add realistic time variation for given doses
        const givenTime = addTimeVariation(
            admin.firestore.Timestamp.fromDate(scheduledTime),
            pattern === 'excellent' ? 30 : 120 // Bella: ±30min, Max: ±2hrs
        );
        record.givenAt = givenTime;
    }

    // Add symptom data (more frequent for Bella, sporadic for Max)
    if (shouldAddSymptoms(pattern)) {
        record.symptoms = generateSymptomData(pattern);
    }

    return record;
}

function determineIfDoseGiven(pattern, doseIndex) {
    if (pattern === 'excellent') {
        // Bella, Charlie, Mochi: 95%+ adherence with occasional missed doses
        if (doseIndex === 11 || doseIndex === 67 || doseIndex === 134) return false; // Specific missed doses
        return Math.random() < 0.98; // 98% base rate
    } else if (pattern === 'good') {
        // Luna: 78% adherence - good but not perfect
        return Math.random() < 0.78;
    } else if (pattern === 'poor') {
        // Max early period: ~53% adherence
        return Math.random() < 0.53;
    } else if (pattern === 'concerning') {
        // Max current period: ~40% adherence with gaps
        const gapPattern = [true, true, false, false, false, true, false, false, false, true];
        return gapPattern[doseIndex % 10] && Math.random() < 0.6;
    } else if (pattern === 'discontinued') {
        // Charlie's antibiotic - good adherence until discontinued early
        if (doseIndex < 14) return Math.random() < 0.95; // First 7 days excellent
        return false; // Discontinued after that
    }
    return true;
}

function shouldAddSymptoms(pattern) {
    if (pattern === 'excellent') {
        return Math.random() < 0.7; // Bella, Charlie, Mochi log frequently
    } else if (pattern === 'good') {
        return Math.random() < 0.85; // Luna logs very frequently (symptom-focused)
    } else {
        return Math.random() < 0.3; // Max logs sporadically
    }
}

function generateSymptomData(pattern) {
    if (pattern === 'excellent') {
        // Bella, Charlie, Mochi: positive symptoms
        return {
            appetite: Math.floor(Math.random() * 2) + 4, // 4-5
            energyLevel: Math.floor(Math.random() * 2) + 4, // 4-5
            isPanting: Math.random() < 0.1, // Rarely
            notes: getPositiveSymptomNote(),
            recordedAt: admin.firestore.Timestamp.fromDate(new Date())
        };
    } else if (pattern === 'good') {
        // Luna: mixed symptoms with some concerning patterns
        return {
            appetite: Math.floor(Math.random() * 3) + 3, // 3-5
            energyLevel: Math.floor(Math.random() * 3) + 3, // 3-5
            isPanting: Math.random() < 0.2, // Occasionally
            notes: getMixedSymptomNote(),
            recordedAt: admin.firestore.Timestamp.fromDate(new Date())
        };
    } else {
        // Max: concerning symptoms
        return {
            appetite: Math.floor(Math.random() * 3) + 2, // 2-4
            energyLevel: Math.floor(Math.random() * 2) + 2, // 2-3
            isPanting: Math.random() < 0.6, // Frequently
            notes: getConcerningSymptomNote(),
            recordedAt: admin.firestore.Timestamp.fromDate(new Date())
        };
    }
}

function getPositiveSymptomNote() {
    const notes = [
        'Playing fetch again!',
        'Sleeping well',
        'Eating all meals',
        'Back to normal energy',
        'Happy and alert',
        'No issues today'
    ];
    return notes[Math.floor(Math.random() * notes.length)];
}

function getMixedSymptomNote() {
    const notes = [
        'Slightly less active today',
        'Eating well, good energy',
        'Some scratching but manageable',
        'Normal behavior overall',
        'Hiding a bit more than usual',
        'Good appetite, sleeping more'
    ];
    return notes[Math.floor(Math.random() * notes.length)];
}

function getConcerningSymptomNote() {
    const notes = [
        'Breathing seems harder',
        'Not interested in walks',
        'Stopped eating breakfast',
        'Coughing at night',
        'Seems tired',
        'Less active than usual'
    ];
    return notes[Math.floor(Math.random() * notes.length)];
}

// Run the script
if (require.main === module) {
    setupDemoEnvironment()
        .then(() => {
            console.log('✅ Demo setup completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Demo setup failed:', error);
            process.exit(1);
        });
}

module.exports = {
    setupDemoEnvironment,
    DEMO_VET_UID,
    DEMO_EMAIL
};
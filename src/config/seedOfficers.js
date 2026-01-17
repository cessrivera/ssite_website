// Script to seed officers into Firestore
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from './firebase';

const officersData = [
  {
    // Mr. Mark Anthony D. Madalipay, MT - SSITE Adviser
    name: "Mr. Mark Anthony D. Madalipay, MT",
    position: "SSITE Adviser",
    course: "",
    section: "",
    yearLevel: "",
    term: "2025-2026",
    image: "https://ibb.co/Pz98hd69",
    order: 1
  },
  {
    // Avan Jae S. Garcia - President (BSIT 3A)
    name: "Avan Jae S. Garcia",
    position: "President",
    course: "BSIT",
    section: "3A",
    yearLevel: "3rd Year",
    term: "2025-2026",
    image: "https://ibb.co/tpqrQ1cC",
    order: 2
  },
  {
    // Kimberly O. Manaloto - Executive Assistant to the President (BSIT 4B)
    name: "Kimberly O. Manaloto",
    position: "Executive Assistant to the President",
    course: "BSIT",
    section: "4B",
    yearLevel: "4th Year",
    term: "2025-2026",
    image: "https://ibb.co/hx69mX9Q",
    order: 3
  },
  {
    // Yaslee GJ M. Guevarra - Vice President for Internal (BSIT 3A)
    name: "Yaslee GJ M. Guevarra",
    position: "Vice President for Internal",
    course: "BSIT",
    section: "3A",
    yearLevel: "3rd Year",
    term: "2025-2026",
    image: "https://ibb.co/Zp8SfKvs",
    order: 4
  },
  {
    // Ernz Danielle D. Manalo - Vice President for External (BSIT 4B)
    name: "Ernz Danielle D. Manalo",
    position: "Vice President for External",
    course: "BSIT",
    section: "4B",
    yearLevel: "4th Year",
    term: "2025-2026",
    image: "https://ibb.co/wF9ktmgy",
    order: 5
  },
  {
    // Joaquin Cyrus A. Panililio - Secretary (WMD 2C)
    name: "Joaquin Cyrus A. Panililio",
    position: "Secretary",
    course: "WMD",
    section: "2C",
    yearLevel: "2nd Year",
    term: "2025-2026",
    image: "https://ibb.co/RZmQw1b",
    order: 6
  },
  {
    // Patricia Alizah G. Henson - Treasurer (BSIT 3A)
    name: "Patricia Alizah G. Henson",
    position: "Treasurer",
    course: "BSIT",
    section: "3A",
    yearLevel: "3rd Year",
    term: "2025-2026",
    image: "https://ibb.co/xtL6WdMd",
    order: 7
  },
  {
    // Sean Glenn B. Magcalas - Auditor (BSIT 4B)
    name: "Sean Glenn B. Magcalas",
    position: "Auditor",
    course: "BSIT",
    section: "4B",
    yearLevel: "4th Year",
    term: "2025-2026",
    image: "https://ibb.co/93mmhq8H",
    order: 8
  },
  {
    // Graciella E. Pastoral - Public Information Officer (BSIT 3A)
    name: "Graciella E. Pastoral",
    position: "Public Information Officer",
    course: "BSIT",
    section: "3A",
    yearLevel: "3rd Year",
    term: "2025-2026",
    image: "https://ibb.co/QvvM0M3c",
    order: 9
  },
  {
    // Theoanna Jether D. Alejos - Creative Director (BSIT 3A)
    name: "Theoanna Jether D. Alejos",
    position: "Creative Director",
    course: "BSIT",
    section: "3A",
    yearLevel: "3rd Year",
    term: "2025-2026",
    image: "https://ibb.co/HTnF0yg4",
    order: 10
  },
  {
    // Joe Peter M. Briola - Sergeant (BSIT 4B)
    name: "Joe Peter M. Briola",
    position: "Sergeant",
    course: "BSIT",
    section: "4B",
    yearLevel: "4th Year",
    term: "2025-2026",
    image: "https://ibb.co/JRT0tMrZ",
    order: 11
  },
  {
    // Justin Vince M. Sunga - Assistant Business Manager (BSIT 3A)
    name: "Justin Vince M. Sunga",
    position: "Assistant Business Manager",
    course: "BSIT",
    section: "3A",
    yearLevel: "3rd Year",
    term: "2025-2026",
    image: "https://ibb.co/MkNNPdnP",
    order: 12
  },
  {
    // CJ Kyle C. Judilla - 1st Year Student Dev Coordinator (WMD 1A)
    name: "CJ Kyle C. Judilla",
    position: "1st Year Student Dev Coordinator",
    course: "WMD",
    section: "1A",
    yearLevel: "1st Year",
    term: "2025-2026",
    image: "https://ibb.co/zHxHsj0s",
    order: 13
  },
  {
    // Hanna Samantha N. Lising - 1st Year Sports Coordinator (WMD 1B)
    name: "Hanna Samantha N. Lising",
    position: "1st Year Sports Coordinator",
    course: "WMD",
    section: "1B",
    yearLevel: "1st Year",
    term: "2025-2026",
    image: "https://ibb.co/Xr179X66",
    order: 14
  },
  {
    // Siegfred M. Pineda - 2nd Year Student Dev Coordinator (WMD 2A)
    name: "Siegfred M. Pineda",
    position: "2nd Year Student Dev Coordinator",
    course: "WMD",
    section: "2A",
    yearLevel: "2nd Year",
    term: "2025-2026",
    image: "https://ibb.co/VYxrv37X",
    order: 15
  },
  {
    // Jan Andrei O. Teresa - 2nd Year Sports Coordinator (WMD 2A)
    name: "Jan Andrei O. Teresa",
    position: "2nd Year Sports Coordinator",
    course: "WMD",
    section: "2A",
    yearLevel: "2nd Year",
    term: "2025-2026",
    image: "https://ibb.co/Q3LQmBCB",
    order: 16
  },
  {
    // Glenn P. Peña - 3rd Year Sports Coordinator (BSIT 3A)
    name: "Glenn P. Peña",
    position: "3rd Year Sports Coordinator",
    course: "BSIT",
    section: "3A",
    yearLevel: "3rd Year",
    term: "2025-2026",
    image: "https://ibb.co/nsZsBZhZ",
    order: 17
  },
  {
    // Stephany Ann S. Dela Peña - 3rd Year Student Dev Coordinator (BSIT 3A)
    name: "Stephany Ann S. Dela Peña",
    position: "3rd Year Student Dev Coordinator",
    course: "BSIT",
    section: "3A",
    yearLevel: "3rd Year",
    term: "2025-2026",
    image: "https://ibb.co/S7G9TB53",
    order: 18
  },
  {
    // Lawrence Mhael M. Bakuyot - 4th Year Student Dev Coordinator (BSIT 4A)
    name: "Lawrence Mhael M. Bakuyot",
    position: "4th Year Student Dev Coordinator",
    course: "BSIT",
    section: "4A",
    yearLevel: "4th Year",
    term: "2025-2026",
    image: "https://ibb.co/jvWFSJGW",
    order: 19
  },
  {
    // Justine Jay A. Enriquez - 4th Year Sports Coordinator (BSIT 4B)
    name: "Justine Jay A. Enriquez",
    position: "4th Year Sports Coordinator",
    course: "BSIT",
    section: "4B",
    yearLevel: "4th Year",
    term: "2025-2026",
    image: "https://ibb.co/35yRpCv1",
    order: 20
  }
];

// Function to clear existing officers and add new ones
export const seedOfficers = async () => {
  try {
    // First, delete all existing officers
    const officersRef = collection(db, 'officers');
    const snapshot = await getDocs(officersRef);
    
    const deletePromises = snapshot.docs.map(docSnap => 
      deleteDoc(doc(db, 'officers', docSnap.id))
    );
    await Promise.all(deletePromises);
    console.log('Deleted existing officers');

    // Add all new officers
    const addPromises = officersData.map(officer => 
      addDoc(officersRef, {
        ...officer,
        createdAt: new Date().toISOString()
      })
    );
    
    await Promise.all(addPromises);
    console.log('Successfully seeded', officersData.length, 'officers!');
    return { success: true, count: officersData.length };
  } catch (error) {
    console.error('Error seeding officers:', error);
    return { success: false, error: error.message };
  }
};

export default officersData;

export const UserStatuses = [
  { label: "Active", value: 1 },
  { label: "Inactive", value: 2 },
  { label: "Temporary Blocked", value: 3 },
  { label: "New", value: 4 },
];

export const getStatusOptionByValue = (value) =>
  UserStatuses.find((item) => Number(item.value) === Number(value)) || null;

export const GenderOptions = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Other", value: "other" },
];

export const MaritalStatusOptions = [
  { label: "Single", value: "single" },
  { label: "Married", value: "married" },
  { label: "Remarried", value: "remarried" },
  { label: "Divorced", value: "divorced" },
  { label: "Widowed", value: "widowed" },
  { label: "Separated", value: "separated" },
];

export const BloodGroupOptions = [
  { label: "A+", value: "A+" },
  { label: "A-", value: "A-" },
  { label: "B+", value: "B+" },
  { label: "B-", value: "B-" },
  { label: "AB+", value: "AB+" },
  { label: "AB-", value: "AB-" },
  { label: "O+", value: "O+" },
  { label: "O-", value: "O-" },
];

export const getOptionByValue = (options, value) => {
  if (value == null || value === "") return null;
  return (
    options.find((item) => String(item.value) === String(value)) || {
      label: String(value),
      value: String(value),
    }
  );
};

/** Occupation dropdown options for UserDetails (exact labels) */
export const OccupationOptions = [
  { label: "Student", value: "Student" },
  { label: "Government Job", value: "Government Job" },
  { label: "Private Job", value: "Private Job" },
  { label: "Business", value: "Business" },
];

/** Occupation value -> which occupationDetails fields to show (field key -> label) */
export const OccupationFieldConfig = {
  "Government Job": [
    { key: "department", label: "Department" },
    { key: "position", label: "Position / Post" },
    { key: "location", label: "Location" },
  ],
  "Private Job": [
    { key: "department", label: "Department" },
    { key: "position", label: "Position / Post" },
    { key: "location", label: "Location" },
  ],
  Business: [
    { key: "businessName", label: "Business Name" },
    { key: "businessType", label: "Business Type" },
    { key: "location", label: "Location" },
  ],
  Student: [],
};
/**
 * Education dropdown options for UserDetails.
 * Single source of truth (frontend + backend).
 * label → full form / user-friendly
 * value → short, normalized, backend-safe
 */

export const EducationOptions = [
  // =========================
  // School / Pre-College
  // =========================
  { label: "No Formal Education", value: "no_formal_education" },
  { label: "Primary School", value: "primary" },
  { label: "Middle School (8th)", value: "middle_school" },
  { label: "Below 10th", value: "below_10th" },
  { label: "10th (Matriculation)", value: "10th" },
  { label: "12th (Intermediate / HSC)", value: "12th" },
  { label: "Open School (NIOS)", value: "nios" },
  { label: "GED", value: "ged" },

  // =========================
  // ITI / Vocational / Skill
  // =========================
  { label: "ITI (Industrial Training Institute)", value: "iti" },
  { label: "Polytechnic", value: "polytechnic" },
  { label: "Trade Certificate", value: "trade_certificate" },
  { label: "National Trade Certificate (NTC)", value: "ntc" },
  { label: "National Apprenticeship Certificate (NAC)", value: "nac" },
  { label: "Craft Instructor Training Scheme (CITS)", value: "cits" },
  { label: "Apprenticeship", value: "apprenticeship" },
  { label: "Industrial Apprenticeship", value: "industrial_apprenticeship" },
  { label: "Vocational Training", value: "vocational_training" },
  { label: "NSQF Certificate", value: "nsqf_certificate" },
  { label: "Skill Certificate", value: "skill_certificate" },
  { label: "Certificate Course", value: "certificate_course" },
  { label: "Advanced Certificate", value: "advanced_certificate" },
  { label: "Foundation Course", value: "foundation_course" },
  { label: "Associate Degree", value: "associate_degree" },
  { label: "Higher National Diploma (HND)", value: "hnd" },

  // =========================
  // Computer Certificates (NIELIT / DOEACC)
  // =========================
  { label: "CCC (Course on Computer Concepts)", value: "ccc" },
  { label: "NIELIT O Level", value: "o_level" },
  { label: "NIELIT A Level", value: "a_level" },
  { label: "NIELIT B Level", value: "b_level" },
  { label: "NIELIT C Level", value: "c_level" },
  { label: "NIELIT (Other)", value: "nielit" },

  // =========================
  // Diploma
  // =========================
  { label: "Diploma (Engineering)", value: "diploma_engg" },
  { label: "Diploma (Non-Engineering)", value: "diploma_other" },
  { label: "Diploma in Pharmacy (D.Pharm)", value: "dpharm" },
  { label: "Diploma in Education (D.El.Ed)", value: "deled" },
  { label: "Diploma in Hotel Management", value: "dhm" },
  { label: "Diploma in Nursing", value: "diploma_nursing" },
  { label: "Diploma in Agriculture", value: "diploma_agriculture" },
  { label: "Diploma in Computer Applications (DCA)", value: "dca" },
  { label: "Advanced Diploma in Computer Applications (ADCA)", value: "adca" },
  { label: "Diploma in Nautical Science (DNS)", value: "dns" },
  { label: "Post Graduate Diploma (PG Diploma)", value: "pg_diploma" },
  { label: "PGDCA", value: "pgdca" },
  { label: "PGDM", value: "pgdm" },

  // =========================
  // Bachelor – Arts / Science / Commerce
  // =========================
  { label: "BA (Bachelor of Arts)", value: "ba" },
  { label: "BA (Honours)", value: "ba_hons" },
  { label: "BSc (Bachelor of Science)", value: "bsc" },
  { label: "BSc (Honours)", value: "bsc_hons" },
  { label: "BCom (Bachelor of Commerce)", value: "bcom" },
  { label: "BCom (Honours)", value: "bcom_hons" },
  { label: "B.Voc (Bachelor of Vocation)", value: "bvoc" },

  // =========================
  // Bachelor – Computer / IT
  // =========================
  { label: "BCA (Bachelor of Computer Applications)", value: "bca" },
  { label: "BSc Computer Science", value: "bsc_cs" },
  { label: "BSc Information Technology", value: "bsc_it" },
  { label: "BSc Data Science", value: "bsc_data_science" },
  { label: "BSc Artificial Intelligence", value: "bsc_ai" },
  { label: "BSc Electronics", value: "bsc_electronics" },
  { label: "BSc Statistics", value: "bsc_statistics" },

  // =========================
  // Bachelor – Engineering / Technology
  // =========================
  { label: "BE (Bachelor of Engineering)", value: "be" },
  { label: "BTech (Bachelor of Technology)", value: "btech" },
  { label: "BTech Computer Science", value: "btech_cse" },
  { label: "BTech Information Technology", value: "btech_it" },
  { label: "BTech Electronics & Communication", value: "btech_ece" },
  { label: "BTech Electrical Engineering", value: "btech_electrical" },
  { label: "BTech Mechanical Engineering", value: "btech_mechanical" },
  { label: "BTech Civil Engineering", value: "btech_civil" },
  { label: "BTech Chemical Engineering", value: "btech_chemical" },
  { label: "BTech Biotechnology", value: "btech_biotech" },
  { label: "BTech Aerospace Engineering", value: "btech_aerospace" },
  { label: "BTech Aeronautical Engineering", value: "btech_aeronautical" },
  { label: "BTech Automobile Engineering", value: "btech_automobile" },
  { label: "BTech Agricultural Engineering", value: "btech_agri" },
  { label: "BTech Food Technology", value: "btech_food" },
  { label: "BTech Dairy Technology", value: "btech_dairy" },
  { label: "BTech Petroleum Engineering", value: "btech_petroleum" },
  { label: "BTech Mining Engineering", value: "btech_mining" },
  { label: "BTech Metallurgical Engineering", value: "btech_metallurgy" },
  { label: "BTech Production Engineering", value: "btech_production" },
  { label: "BTech Industrial Engineering", value: "btech_industrial" },
  { label: "BTech Instrumentation Engineering", value: "btech_instrumentation" },
  { label: "BTech Environmental Engineering", value: "btech_environmental" },
  { label: "BTech Mechatronics Engineering", value: "btech_mechatronics" },
  { label: "BTech Robotics Engineering", value: "btech_robotics" },
  { label: "BTech Textile Engineering", value: "btech_textile" },
  { label: "BTech Ceramic Engineering", value: "btech_ceramic" },
  { label: "BTech Leather Technology", value: "btech_leather" },
  { label: "BTech Printing Technology", value: "btech_printing" },
  { label: "Marine Engineering", value: "marine_engineering" },

  // =========================
  // Bachelor – Management / Commerce Specializations
  // =========================
  { label: "BBA (Bachelor of Business Administration)", value: "bba" },
  { label: "BBM (Bachelor of Business Management)", value: "bbm" },
  { label: "BMS (Bachelor of Management Studies)", value: "bms" },
  { label: "BBS (Bachelor of Business Studies)", value: "bbs" },
  { label: "BFM (Bachelor of Financial Management)", value: "bfm" },
  { label: "BAF (Bachelor of Accounting & Finance)", value: "baf" },
  { label: "BFIA (Financial Investment Analysis)", value: "bfia" },
  { label: "BBE (Bachelor of Business Economics)", value: "bbe" },
  { label: "BCCA (Commerce & Computer Applications)", value: "bcca" },
  { label: "BCS (Bachelor of Corporate Secretaryship)", value: "bcs" },
  { label: "Bachelor of Taxation", value: "btax" },
  { label: "Bachelor of Economics", value: "economics" },
  { label: "Bachelor of Banking & Insurance", value: "banking_insurance" },
  { label: "Bachelor of Financial Markets", value: "financial_markets" },

  // =========================
  // Bachelor – Law
  // =========================
  { label: "LLB (Bachelor of Laws)", value: "llb" },
  { label: "BA LLB (Integrated)", value: "ba_llb" },
  { label: "BBA LLB (Integrated)", value: "bba_llb" },
  { label: "BCom LLB (Integrated)", value: "bcom_llb" },
  { label: "BSc LLB (Integrated)", value: "bsc_llb" },
  { label: "BTech LLB (Integrated)", value: "btech_llb" },
  { label: "BLS LLB", value: "bls_llb" },

  // =========================
  // Bachelor – Education / Teacher Training
  // =========================
  { label: "BEd (Bachelor of Education)", value: "bed" },
  { label: "Special B.Ed", value: "special_bed" },
  { label: "B.El.Ed", value: "beled" },
  { label: "BPEd (Physical Education)", value: "bped" },
  { label: "BA + BEd (Integrated)", value: "ba_bed" },
  { label: "BSc + BEd (Integrated)", value: "bsc_bed" },
  { label: "BCom + BEd (Integrated)", value: "bcom_bed" },
  { label: "JBT (Junior Basic Training)", value: "jbt" },
  { label: "BTC (Basic Training Certificate)", value: "btc" },
  { label: "NTT (Nursery Teacher Training)", value: "ntt" },
  { label: "Montessori Teacher Training", value: "montessori" },
  { label: "ECCEd (Early Childhood Care & Education)", value: "ecced" },
  { label: "Shiksha Shastri", value: "shiksha_shastri" },

  // =========================
  // Bachelor – Medical / AYUSH
  // =========================
  { label: "MBBS", value: "mbbs" },
  { label: "BDS", value: "bds" },
  { label: "BAMS", value: "bams" },
  { label: "BHMS", value: "bhms" },
  { label: "BUMS", value: "bums" },
  { label: "BNYS", value: "bnys" },
  { label: "BVSc & AH", value: "bvsc" },
  { label: "BPharm", value: "bpharm" },
  { label: "PharmD", value: "pharmd" },
  { label: "PharmD (Post Baccalaureate)", value: "pharmd_pb" },

  // =========================
  // Bachelor – Nursing / Paramedical / Allied Health
  // =========================
  { label: "BSc Nursing", value: "bsc_nursing" },
  { label: "Post Basic BSc Nursing", value: "post_basic_bsc_nursing" },
  { label: "GNM", value: "gnm" },
  { label: "ANM", value: "anm" },
  { label: "BPT (Physiotherapy)", value: "bpt" },
  { label: "BOT (Occupational Therapy)", value: "bot" },
  { label: "BMLT (Medical Lab Technology)", value: "bmlt" },
  { label: "BASLP (Audiology & Speech Language Pathology)", value: "baslp" },
  { label: "BPO (Prosthetics & Orthotics)", value: "bpo_medical" },
  { label: "Bachelor of Respiratory Therapy", value: "respiratory_therapy" },
  { label: "Bachelor of Perfusion Technology", value: "perfusion_technology" },
  { label: "Bachelor of Medical Imaging Technology", value: "bmit" },
  { label: "Bachelor of Renal Dialysis Technology", value: "brdt" },
  { label: "BSc Radiology", value: "bsc_radiology" },
  { label: "BSc Optometry", value: "bsc_optometry" },
  { label: "BSc Anesthesia Technology", value: "bsc_anesthesia" },
  { label: "BSc Cardiac Care Technology", value: "bsc_cardiac" },
  { label: "BSc Dialysis Technology", value: "bsc_dialysis" },
  { label: "BSc Operation Theatre Technology", value: "bsc_ot" },
  { label: "BSc Emergency Medical Technology", value: "bsc_emergency" },
  { label: "BSc Nutrition & Dietetics", value: "bsc_nutrition" },
  { label: "BSc Neuroscience Technology", value: "bsc_neuroscience" },
  { label: "BSc Nuclear Medicine Technology", value: "bsc_nuclear_medicine" },
  { label: "BSc Blood Bank Technology", value: "bsc_blood_bank" },
  { label: "BSc Imaging Technology", value: "bsc_imaging" },

  // =========================
  // Bachelor – Agriculture / Life Sciences
  // =========================
  { label: "BSc Agriculture", value: "bsc_agriculture" },
  { label: "BSc Horticulture", value: "bsc_horticulture" },
  { label: "BSc Forestry", value: "bsc_forestry" },
  { label: "BSc Fisheries", value: "bsc_fisheries" },
  { label: "BSc Food Technology", value: "bsc_food_technology" },
  { label: "BSc Dairy Technology", value: "bsc_dairy" },
  { label: "BSc Sericulture", value: "bsc_sericulture" },
  { label: "BSc Seed Technology", value: "bsc_seed_technology" },
  { label: "BSc Agribusiness Management", value: "bsc_agribusiness" },
  { label: "BSc Plant Pathology", value: "bsc_plant_pathology" },
  { label: "BSc Soil Science", value: "bsc_soil_science" },
  { label: "BSc Agronomy", value: "bsc_agronomy" },
  { label: "BSc Biotechnology", value: "bsc_biotechnology" },
  { label: "BSc Microbiology", value: "bsc_microbiology" },
  { label: "BSc Genetics", value: "bsc_genetics" },
  { label: "BSc Home Science", value: "bsc_home_science" },
  { label: "Bachelor of Biochemistry", value: "biochemistry" },
  { label: "Bachelor of Bioinformatics", value: "bioinformatics" },
  { label: "Bachelor of Forensic Science", value: "forensic_science" },
  { label: "Bachelor of Environmental Science", value: "environmental_science" },
  { label: "Bachelor of Geology", value: "geology" },
  { label: "Bachelor of Anthropology", value: "anthropology" },
  { label: "Bachelor of Mathematics", value: "mathematics" },
  { label: "Bachelor of Physics", value: "physics" },
  { label: "Bachelor of Chemistry", value: "chemistry" },
  { label: "Bachelor of Zoology", value: "zoology" },
  { label: "Bachelor of Botany", value: "botany" },

  // =========================
  // Bachelor – Hotel / Hospitality / Tourism
  // =========================
  { label: "BHM (Bachelor of Hotel Management)", value: "bhm" },
  { label: "BHMCT", value: "bhmct" },
  { label: "BSc Hotel Management", value: "bsc_hotel_management" },
  { label: "Bachelor of Hospitality Management", value: "hospitality_management" },
  { label: "Culinary Arts", value: "culinary_arts" },
  { label: "Tourism Management", value: "tourism_management" },
  { label: "Event Management", value: "event_management" },
  { label: "Cruise Hospitality", value: "cruise_hospitality" },

  // =========================
  // Bachelor – Architecture / Planning / Design
  // =========================
  { label: "BArch", value: "barch" },
  { label: "B.Plan (Bachelor of Planning)", value: "bplan" },
  { label: "Urban Planning", value: "urban_planning" },
  { label: "Landscape Architecture", value: "landscape_architecture" },
  { label: "BDes (Bachelor of Design)", value: "bdes" },
  { label: "BFA (Fine Arts)", value: "bfa" },
  { label: "BVA (Visual Arts)", value: "bva" },
  { label: "BPA (Performing Arts)", value: "bpa" },
  { label: "Bachelor of Interior Design", value: "interior_design" },
  { label: "Bachelor of Fashion Design", value: "fashion_design" },
  { label: "Bachelor of Graphic Design", value: "graphic_design" },
  { label: "Bachelor of Product Design", value: "product_design" },
  { label: "Bachelor of Industrial Design", value: "industrial_design" },
  { label: "Bachelor of Textile Design", value: "textile_design" },
  { label: "Bachelor of Jewellery Design", value: "jewellery_design" },
  { label: "Bachelor of Communication Design", value: "communication_design" },
  { label: "Bachelor of Animation", value: "animation" },
  { label: "Bachelor of Game Design", value: "game_design" },
  { label: "Bachelor of UI/UX Design", value: "uiux_design" },
  { label: "Bachelor of Multimedia", value: "multimedia" },
  { label: "Bachelor of VFX", value: "vfx" },
  { label: "Bachelor of Film Making", value: "film_making" },
  { label: "Bachelor of Photography", value: "photography" },

  // =========================
  // Bachelor – Journalism / Media / Arts / Languages
  // =========================
  { label: "BJMC", value: "bjmc" },
  { label: "Bachelor of Journalism", value: "bj" },
  { label: "Bachelor of Mass Communication", value: "mass_comm" },
  { label: "Public Relations", value: "public_relations" },
  { label: "Advertising", value: "advertising" },
  { label: "Digital Media", value: "digital_media" },
  { label: "B.Mus", value: "bmus" },
  { label: "Bachelor of Dance", value: "dance" },
  { label: "Bachelor of Theatre", value: "theatre" },
  { label: "Bachelor of Psychology", value: "psychology" },
  { label: "Bachelor of Sociology", value: "sociology" },
  { label: "Bachelor of Political Science", value: "political_science" },
  { label: "Bachelor of Public Administration", value: "public_administration" },
  { label: "Bachelor of English", value: "english" },
  { label: "Bachelor of Hindi", value: "hindi" },
  { label: "Bachelor of Sanskrit", value: "sanskrit" },
  { label: "Bachelor of Arabic", value: "arabic" },
  { label: "BSW (Bachelor of Social Work)", value: "bsw" },
  { label: "B.Lib.I.Sc (Library Science)", value: "blib" },
  { label: "Other Bachelor's Degree", value: "other_bachelor" },

  // =========================
  // Aviation / Merchant Navy
  // =========================
  { label: "Commercial Pilot License (CPL)", value: "cpl" },
  { label: "Aircraft Maintenance Engineering (AME)", value: "ame" },
  { label: "Airport Management", value: "airport_management" },
  { label: "Aviation Management", value: "aviation_management" },
  { label: "Cabin Crew", value: "cabin_crew" },
  { label: "Flight Dispatcher", value: "flight_dispatcher" },
  { label: "Ground Staff Training", value: "ground_staff" },
  { label: "Merchant Navy", value: "merchant_navy" },
  { label: "BSc Nautical Science", value: "nautical_science" },

  // =========================
  // Integrated Degrees
  // =========================
  { label: "BTech + MTech (Integrated)", value: "btech_mtech" },
  { label: "BS + MS (Integrated)", value: "bs_ms" },
  { label: "BCA + MCA (Integrated)", value: "bca_mca" },
  { label: "Integrated BBA + MBA", value: "bba_mba_integrated" },
  { label: "Integrated MA", value: "integrated_ma" },
  { label: "Integrated MSc", value: "integrated_msc" },
  { label: "Integrated PhD", value: "integrated_phd" },

  // =========================
  // Master – Arts / Science / Commerce / IT
  // =========================
  { label: "MA (Master of Arts)", value: "ma" },
  { label: "MA English", value: "ma_english" },
  { label: "MA Hindi", value: "ma_hindi" },
  { label: "MA Sanskrit", value: "ma_sanskrit" },
  { label: "MSc (Master of Science)", value: "msc" },
  { label: "MCom (Master of Commerce)", value: "mcom" },
  { label: "MCA (Master of Computer Applications)", value: "mca" },
  { label: "MSc Computer Science", value: "msc_cs" },
  { label: "MSc Information Technology", value: "msc_it" },
  { label: "MSc Data Science", value: "msc_data_science" },
  { label: "MSc Data Analytics", value: "msc_data_analytics" },
  { label: "MSc Artificial Intelligence", value: "msc_ai" },
  { label: "MSc AI & Machine Learning", value: "msc_aiml" },
  { label: "MSc Cyber Security", value: "msc_cyber_security" },
  { label: "MSc Cloud Computing", value: "msc_cloud" },
  { label: "MSc Blockchain", value: "msc_blockchain" },
  { label: "MSc Internet of Things", value: "msc_iot" },
  { label: "MSc Mathematics", value: "msc_mathematics" },
  { label: "MSc Physics", value: "msc_physics" },
  { label: "MSc Chemistry", value: "msc_chemistry" },
  { label: "MSc Zoology", value: "msc_zoology" },
  { label: "MSc Botany", value: "msc_botany" },
  { label: "MSc Geology", value: "msc_geology" },
  { label: "MSc Biotechnology", value: "msc_biotechnology" },
  { label: "MSc Microbiology", value: "msc_microbiology" },
  { label: "M.Voc (Master of Vocation)", value: "mvoc" },

  // =========================
  // Master – Engineering / Management / Law / Education
  // =========================
  { label: "MTech (Master of Technology)", value: "mtech" },
  { label: "ME (Master of Engineering)", value: "me" },
  { label: "MTech Agricultural Engineering", value: "mtech_agri" },
  { label: "MBA (Master of Business Administration)", value: "mba" },
  { label: "Executive MBA", value: "executive_mba" },
  { label: "Master of Finance", value: "mfin" },
  { label: "LLM (Master of Laws)", value: "llm" },
  { label: "LLM (Corporate Law)", value: "llm_corporate" },
  { label: "LLM (Criminal Law)", value: "llm_criminal" },
  { label: "MEd (Master of Education)", value: "med" },
  { label: "M.El.Ed", value: "meled" },
  { label: "MPEd (Master of Physical Education)", value: "mped" },

  // =========================
  // Master – Medical / Health / Agriculture
  // =========================
  { label: "MD (Doctor of Medicine)", value: "md" },
  { label: "MS (Master of Surgery)", value: "ms" },
  { label: "MDS (Master of Dental Surgery)", value: "mds" },
  { label: "DNB (Diplomate of National Board)", value: "dnb" },
  { label: "MPharm (Master of Pharmacy)", value: "mpharm" },
  { label: "MPharm (Pharmaceutics)", value: "mpharm_pharmaceutics" },
  { label: "MPharm (Pharmacology)", value: "mpharm_pharmacology" },
  { label: "MPT (Master of Physiotherapy)", value: "mpt" },
  { label: "MSc Nursing", value: "msc_nursing" },
  { label: "MSc Medical Laboratory Technology", value: "msc_mlt" },
  { label: "MSc Radiology", value: "msc_radiology" },
  { label: "MSc Optometry", value: "msc_optometry" },
  { label: "MSc Cardiac Care", value: "msc_cardiac" },
  { label: "MHA (Hospital Administration)", value: "mha" },
  { label: "MPH (Public Health)", value: "mph" },
  { label: "MVSc (Master of Veterinary Science)", value: "mvsc" },
  { label: "MSc Agriculture", value: "msc_agriculture" },
  { label: "MSc Horticulture", value: "msc_horticulture" },
  { label: "MSc Forestry", value: "msc_forestry" },

  // =========================
  // Master – Architecture / Design / Media / Social
  // =========================
  { label: "MArch (Master of Architecture)", value: "march" },
  { label: "M.Plan (Master of Planning)", value: "mplan" },
  { label: "MDes (Master of Design)", value: "mdes" },
  { label: "MFA (Master of Fine Arts)", value: "mfa" },
  { label: "M.Mus", value: "mmus" },
  { label: "MJMC (Journalism & Mass Communication)", value: "mjmc" },
  { label: "MHM (Hotel Management)", value: "mhm" },
  { label: "MSW (Master of Social Work)", value: "msw" },
  { label: "M.Lib.I.Sc", value: "mlib" },
  { label: "Other Master's Degree", value: "other_master" },

  // =========================
  // Professional Qualifications
  // =========================
  { label: "CA (Chartered Accountant)", value: "ca" },
  { label: "CS (Company Secretary)", value: "cs" },
  { label: "CMA (Cost & Management Accountant)", value: "cma" },
  { label: "CFA (Chartered Financial Analyst)", value: "cfa" },
  { label: "CFP (Certified Financial Planner)", value: "cfp" },
  { label: "ACCA", value: "acca" },
  { label: "CPA", value: "cpa" },
  { label: "FRM", value: "frm" },
  { label: "Actuarial Science", value: "actuarial_science" },
  { label: "CIA (Certified Internal Auditor)", value: "cia" },
  { label: "CISA (Certified Information Systems Auditor)", value: "cisa" },
  { label: "CISM (Certified Information Security Manager)", value: "cism" },
  { label: "PMP (Project Management Professional)", value: "pmp" },
  { label: "Patent Agent", value: "patent_agent" },
  { label: "Registered Valuer", value: "registered_valuer" },

  // =========================
  // Doctorate / Research
  // =========================
  { label: "MPhil (Master of Philosophy)", value: "mphil" },
  { label: "PhD (Doctor of Philosophy)", value: "phd" },
  { label: "DPhil", value: "dphil" },
  { label: "DM", value: "dm" },
  { label: "MCh", value: "mch" },
  { label: "DSc (Doctor of Science)", value: "dsc" },
  { label: "DLitt (Doctor of Literature)", value: "dlitt" },
  { label: "Post Doctoral Fellowship", value: "post_doctoral" },
  { label: "Other Doctorate", value: "other_doctorate" },

  // =========================
  // Traditional / Oriental / Religious
  // =========================
  { label: "Shastri", value: "shastri" },
  { label: "Acharya", value: "acharya" },
  { label: "Visharad", value: "visharad" },
  { label: "Prabhakar", value: "prabhakar" },
  { label: "Sahitya Ratna", value: "sahitya_ratna" },
  { label: "Sangeet Visharad", value: "sangeet_visharad" },
  { label: "Sangeet Prabhakar", value: "sangeet_prabhakar" },
  { label: "Maulvi", value: "maulvi" },
  { label: "Alim", value: "alim" },
  { label: "Fazil", value: "fazil" },
  { label: "Kamil", value: "kamil" },

  // =========================
  // Misc
  // =========================
  { label: "Other / Not Listed", value: "other" },
];

/** Max selected education values (keep in sync with server educationHelper). */
export const MAX_EDUCATIONS = 5;

export const toEducationArray = (raw) => {
  if (raw === undefined || raw === null || raw === "") return [];
  if (Array.isArray(raw)) {
    return raw
      .map((item) => (item == null ? "" : String(item).trim()))
      .filter((item) => item !== "");
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    return trimmed ? [trimmed] : [];
  }
  return [];
};

export const getEducationSelectValues = (options, education) => {
  const list = Array.isArray(options) ? options : [];
  return toEducationArray(education).map((value) => {
    const found = list.find((o) => String(o.value) === String(value));
    return found || { label: String(value), value: String(value) };
  });
};

export const educationValuesFromSelect = (selected) => {
  if (!selected) return [];
  const list = Array.isArray(selected) ? selected : [selected];
  return list
    .map((option) => option?.value)
    .filter((value) => value != null && value !== "")
    .map((value) => String(value).trim());
};

export const getEducationLabel = (value) => {
  if (value == null || value === "") return "";
  const found = EducationOptions.find(
    (option) => String(option.value) === String(value),
  );
  return found?.label || String(value);
};

/** Display: "B.Tech, MBA" (empty → ""). */
export const formatEducationLabels = (education) => {
  const labels = toEducationArray(education)
    .map(getEducationLabel)
    .filter(Boolean);
  return labels.join(", ");
};

export const SubAdminRoleOptions = [
  { value: "sub_admin", label: "Sub Admin" },
  { value: "staff", label: "Staff" },
  { value: "manager", label: "Manager" },
];

export const DonationTypeOptions = [
  { value: "FIXED", label: "FIXED" },
  { value: "ANY", label: "ANY" },
];

export const MembershipDurationTypeOptions = [
  { label: "Days", value: "days" },
  { label: "Months", value: "months" },
  { label: "Years", value: "years" },
  { label: "Lifetime", value: "lifetime" },
];

export const PaymentStatusOptions = [
  { label: "Pending", value: "pending" },
  { label: "Success", value: "success" },
  { label: "Failed", value: "failed" },
];

export const MarriageEndStatusOptions = [
  { value: "divorced", label: "Divorced" },
  { value: "widowed", label: "Widowed" },
];

export const Spouse2ModeOptions = [
  { value: "existing", label: "Existing" },
  { value: "new", label: "New" },
];

export const ChildModeOptions = [
  { value: "new", label: "New" },
  { value: "existing", label: "Existing" },
];

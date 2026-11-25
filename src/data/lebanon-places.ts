/**
 * Lebanese cities, towns and city areas for the address "City / area" picker.
 *
 * - Beirut neighbourhoods carry `city: "Beirut"` (stored as address `{ city: "Beirut", area: "Hamra" }`).
 * - Every other entry IS the city/town (stored as `{ city: "Sawfar" }`).
 * - `aka` lists other common spellings so search finds "Ashrafieh" as well as "Achrafieh".
 *
 * Grouped by governorate → district (caza), using the 2017 governorate split
 * (Keserwan-Jbeil, Akkar and Baalbek-Hermel are their own governorates).
 * Staff can still type a place that isn't listed (the field accepts free text).
 */

export interface LebanonPlace {
  /** Display name, e.g. "Hamra", "Sawfar". */
  name: string;
  /** Set for neighbourhoods of a bigger city (e.g. "Beirut"); otherwise the place is the city. */
  city?: string;
  district: string;
  governorate: string;
  aka?: string[];
}

/** "Achrafieh|Ashrafieh|Ashrafiyeh" → name + aka */
const group = (governorate: string, district: string, entries: string[], city?: string): LebanonPlace[] =>
  entries.map((entry) => {
    const [name, ...aka] = entry.split("|");
    return { name, district, governorate, ...(city && name !== city ? { city } : {}), ...(aka.length ? { aka } : {}) };
  });

export const LEBANON_PLACES: LebanonPlace[] = [
  /* ---------------------------------------------------------------- Beirut */
  ...group(
    "Beirut",
    "Beirut",
    [
      "Beirut|Bayrut|Beyrouth",
      "Achrafieh|Ashrafieh|Ashrafiyeh|Ashrafiye",
      "Ain El Mreisseh|Ain Mreisseh|Ain al-Mreisseh",
      "Ain El Tineh|Ain Tineh",
      "Badaro",
      "Bachoura|Bashoura",
      "Basta",
      "Bourj Abi Haidar|Burj Abi Haidar",
      "Clemenceau",
      "Corniche El Mazraa|Corniche Mazraa",
      "Downtown|Beirut Central District|Solidere|Centre Ville|Wasat al-Balad",
      "Furn El Hayek",
      "Geitawi|Gitawi",
      "Gemmayzeh|Gemmayze|Jemmayzeh",
      "Hamra|Hamra Street",
      "Jisr El Wati",
      "Jnah|Jnah Beirut",
      "Karakol Druze|Karakol Drouz",
      "Karantina|Quarantina",
      "Karm El Zeitoun",
      "Koreitem|Qoreitem|Qraytem",
      "Manara",
      "Mar Elias",
      "Mar Mikhael|Mar Mkhayel",
      "Mazraa|Mazraa Beirut",
      "Medawar|Mdawar",
      "Minet El Hosn",
      "Monot|Monnot",
      "Mousaitbeh|Msaytbeh|Musaytbeh",
      "Nasra|Nazareth|Nasira",
      "Ramlet El Bayda|Ramlet al-Baida",
      "Ras Beirut",
      "Ras El Nabaa|Ras al-Nabaa",
      "Raouche|Rawsheh|Raoucheh",
      "Rmeil|Rmeileh",
      "Saifi|Saifi Village",
      "Sanayeh|Sanayeh Garden",
      "Sassine|Sassine Square",
      "Sioufi",
      "Sodeco",
      "Tallet El Khayat|Tallet al-Khayyat",
      "Tariq El Jdideh|Tarik El Jdideh|Tariq al-Jadida",
      "Unesco",
      "Verdun",
      "Zarif",
      "Zokak El Blat|Zuqaq al-Blat|Zoukak el Blat",
    ],
    "Beirut"
  ),

  /* ---------------------------------------------------------------- Mount Lebanon */
  ...group("Mount Lebanon", "Baabda", [
    "Baabda",
    "Hazmieh|Hazmiyeh|Hazmiye",
    "Hadath|Hadath Baabda",
    "Furn El Chebbak|Furn el Shebbak",
    "Ain El Remmaneh|Ain el Rummaneh",
    "Chiyah|Shiyah",
    "Ghobeiry|Ghobeiri",
    "Haret Hreik|Haret Hreyk",
    "Bir Hassan",
    "Bourj El Barajneh|Burj al-Barajneh|Borj el Brajneh",
    "Dahieh|Dahiyeh|Southern Suburbs",
    "Laylaki|Lailakeh",
    "Mreijeh|Mrayjeh",
    "Ouzai|Ouzaai",
    "Kfarshima|Kfarchima",
    "Wadi Chahrour",
    "Bsous",
    "Araya|Aaraya",
    "Jamhour",
    "Louaizeh|Louaize",
    "Yarzeh|Yarze",
    "Sebnay",
    "Btekhnay",
    "Ras El Metn|Ras al-Matn",
    "Hammana",
    "Qornayel|Qrayel",
    "Salima",
    "Arsoun",
    "Bmariam",
    "Chbaniyeh|Shbaniyeh",
    "Bdadoun",
  ]),
  ...group("Mount Lebanon", "Aley", [
    "Aley|Aaley|Alay",
    "Bhamdoun|Bhamdoun El Mhatta|Bhamdoun El Balda",
    "Sawfar|Sofar|Saoufar",
    "Choueifat|Shweifat|Chouaifat",
    "Khaldeh|Khalde",
    "Aramoun",
    "Bchamoun|Bshamoun",
    "Souk El Gharb|Souq al-Gharb",
    "Kahaleh|Kahale",
    "Kayfoun|Kaifoun",
    "Ainab",
    "Baysour|Bayssour|Bisor",
    "Chemlan|Shemlan",
    "Aitat",
    "Majdlaya",
    "Bmakkine",
    "Deir Qoubel",
    "Ras El Jabal",
    "Aabey|Abey",
    "Ain Dara",
    "Btater",
    "Rechmaya",
    "Kfarmatta",
    "Ain Anoub",
    "Dfoun",
    "Qmatiyeh",
    "Chartoun",
    "Mejdel Baana",
    "Ain Jdideh",
    "Ain Sofar",
  ]),
  ...group("Mount Lebanon", "Matn", [
    "Jdeideh|Jdeideh El Metn|Jdeidet El Matn",
    "Sin El Fil",
    "Dekwaneh|Dekweneh",
    "Bourj Hammoud|Burj Hammoud",
    "Dora|Daoura",
    "Nabaa",
    "Baouchrieh|Bauchrieh",
    "Sad El Baouchrieh",
    "Sabtieh",
    "Mkalles",
    "Horsh Tabet",
    "Antelias",
    "Jal El Dib",
    "Zalka",
    "Dbayeh",
    "Naccache",
    "Rabieh",
    "Awkar|Aoukar",
    "Mansourieh|Mansourieh El Metn",
    "Fanar",
    "Roumieh",
    "Mtayleb",
    "Ain Saadeh",
    "Bsalim",
    "Mazraat Yachouh",
    "Qornet Chehwan",
    "Ain Najm",
    "Monteverde",
    "Biaqout",
    "Broummana|Brummana|Brummanna",
    "Beit Mery|Beit Meri",
    "Bikfaya",
    "Baabdat",
    "Beit Chabab",
    "Dhour Choueir|Dhour El Choueir",
    "Bteghrine",
    "Mrouj",
    "Falougha",
    "Khenchara",
    "Ain Aar",
    "Zakrit",
  ]),
  ...group("Mount Lebanon", "Chouf", [
    "Beiteddine|Beit ed-Dine|Beit El Dine",
    "Deir El Qamar",
    "Baakline",
    "Damour",
    "Naameh|Naame",
    "Haret Naameh",
    "Barja",
    "Jiyeh|Jiyye",
    "Chhim|Shhim",
    "Ketermaya",
    "Daraya",
    "Wadi El Zayneh",
    "Debbiyeh",
    "Mechref",
    "Moukhtara",
    "Barouk",
    "Maasser El Chouf",
    "Mazraat El Chouf",
    "Kfarnabrakh",
    "Ain Zhalta",
    "Niha",
    "Batloun",
    "Kfarhim",
    "Semqanieh",
    "Gharifeh",
    "Baadarane",
  ]),

  /* ---------------------------------------------------------------- Keserwan-Jbeil */
  ...group("Keserwan-Jbeil", "Keserwan", [
    "Jounieh|Junieh|Jouniyeh",
    "Zouk Mosbeh",
    "Zouk Mikael",
    "Kaslik",
    "Sarba",
    "Adonis",
    "Ghadir",
    "Haret Sakher",
    "Sahel Alma",
    "Ghazir",
    "Adma",
    "Tabarja",
    "Safra",
    "Harissa",
    "Daraoun",
    "Ghosta",
    "Achkout",
    "Ajaltoun",
    "Raifoun|Rayfoun",
    "Ballouneh",
    "Jeita",
    "Kfarhbab",
    "Bzoummar",
    "Faraya|Faraiya",
    "Faqra|Faqra Club",
    "Kfardebian",
    "Mayrouba",
    "Hrajel",
    "Feytroun",
    "Kfour",
  ]),
  ...group("Keserwan-Jbeil", "Jbeil", [
    "Byblos|Jbeil|Jbail",
    "Amchit",
    "Blat",
    "Halat",
    "Fidar",
    "Nahr Ibrahim",
    "Mastita",
    "Qartaba",
    "Ehmej",
    "Lehfed",
    "Annaya",
    "Edde",
    "Aaqoura|Akoura",
    "Laqlouq",
    "Mechmech",
    "Hboub",
  ]),

  /* ---------------------------------------------------------------- North */
  ...group("North", "Tripoli", ["Tripoli|Trablous|Tarablus", "El Mina|Mina", "Abou Samra", "Bab El Tebbaneh", "Qalamoun|Kalamoun", "Ras Maska"]),
  ...group("North", "Zgharta", ["Zgharta", "Ehden", "Kfarhata", "Ardeh", "Miziara"]),
  ...group("North", "Koura", ["Amioun", "Kousba", "Anfeh", "Deddeh", "Kfarhazir", "Bterram", "Balamand"]),
  ...group("North", "Batroun", ["Batroun", "Douma", "Tannourine", "Kfarabida", "Selaata", "Thoum", "Hamat", "Chekka"]),
  ...group("North", "Bcharre", ["Bcharre|Bsharri|Becharre", "Hasroun", "Hadchit", "Bqaa Kafra", "The Cedars|Arz|Cedars"]),
  ...group("North", "Minieh-Danniyeh", ["Minieh|Minyeh", "Sir Ed Danniyeh|Sir El Dinniyeh", "Bechmezzine", "Bakhoun"]),

  /* ---------------------------------------------------------------- Akkar */
  ...group("Akkar", "Akkar", [
    "Halba",
    "Qobayat|Qoubaiyat|Kobayat",
    "Bebnine",
    "Bireh",
    "Andaket",
    "Akkar El Atika",
    "Fnaydeq",
    "Tal Abbas",
    "Menjez",
    "Rahbe",
  ]),

  /* ---------------------------------------------------------------- South */
  ...group("South", "Sidon", [
    "Sidon|Saida|Saïda",
    "Ghazieh",
    "Abra",
    "Maghdouche",
    "Miyeh w Miyeh",
    "Haret Saida",
    "Darb El Sim",
    "Sarafand",
    "Adloun",
    "Zahrani",
  ]),
  ...group("South", "Tyre", ["Tyre|Sour|Sur", "Naqoura", "Qana", "Abbassieh", "Bazourieh", "Burj El Shemali", "Maarakeh"]),
  ...group("South", "Jezzine", ["Jezzine", "Roum", "Kfarhouna", "Bkassine", "Kfarfalous", "Lebaa"]),

  /* ---------------------------------------------------------------- Nabatieh */
  ...group("Nabatieh", "Nabatieh", ["Nabatieh|Nabatiyeh", "Kfar Remen", "Kfar Tebnit", "Zefta", "Arnoun"]),
  ...group("Nabatieh", "Marjayoun", ["Marjayoun|Jdeidet Marjayoun", "Khiam", "Qlayaa"]),
  ...group("Nabatieh", "Bint Jbeil", ["Bint Jbeil", "Aitaroun", "Tebnine"]),
  ...group("Nabatieh", "Hasbaya", ["Hasbaya", "Kfarchouba", "Shebaa", "Kawkaba"]),

  /* ---------------------------------------------------------------- Bekaa */
  ...group("Bekaa", "Zahle", [
    "Zahle|Zahleh",
    "Chtaura|Chtoura|Shtaura",
    "Bar Elias",
    "Qab Elias",
    "Taanayel",
    "Riyaq|Rayak",
    "Ablah",
    "Saadnayel",
    "Ferzol",
    "Ksara",
    "Anjar",
    "Majdal Anjar",
    "Masnaa",
  ]),
  ...group("Bekaa", "West Bekaa", ["Joub Jannine", "Saghbine", "Kamed El Loz", "Machghara", "Sohmor", "Ammiq", "Kefraya"]),
  ...group("Bekaa", "Rashaya", ["Rashaya|Rashaya El Wadi", "Ain Ata"]),

  /* ---------------------------------------------------------------- Baalbek-Hermel */
  ...group("Baalbek-Hermel", "Baalbek", [
    "Baalbek|Baalbeck",
    "Douris",
    "Brital",
    "Chmestar",
    "Iaat",
    "Taybeh",
    "Deir El Ahmar",
    "Yammouneh",
    "Arsal",
    "Labweh",
    "Ras Baalbek",
  ]),
  ...group("Baalbek-Hermel", "Hermel", ["Hermel", "Qaa|Al Qaa"]),
].filter((p, i, all) => all.findIndex((q) => q.name === p.name && q.district === p.district) === i);

/** "Hamra, Beirut" / "Sawfar" — how a place reads in a field or a table. */
export const placeLabel = (p: Pick<LebanonPlace, "name" | "city">) => (p.city ? `${p.name}, ${p.city}` : p.name);

/** Find the dataset entry for a stored `{ city, area }`. */
export const findPlace = (city?: string | null, area?: string | null): LebanonPlace | undefined => {
  const norm = (s?: string | null) => (s ?? "").trim().toLowerCase();
  if (area) {
    const hit = LEBANON_PLACES.find((p) => p.city && norm(p.city) === norm(city) && (norm(p.name) === norm(area) || p.aka?.some((a) => norm(a) === norm(area))));
    if (hit) return hit;
  }
  return LEBANON_PLACES.find((p) => !p.city && (norm(p.name) === norm(city) || p.aka?.some((a) => norm(a) === norm(city))));
};

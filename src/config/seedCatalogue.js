function textFile(name, body) {
  const data = Buffer.from(body, "utf8").toString("base64");
  return {
    name,
    mime_type: "text/plain",
    size: Buffer.byteLength(body, "utf8"),
    data,
  };
}

export const DEFAULT_COURSES = [
  {
    name: "Tunga Taxi EV Driver Programme",
    code: "TT-EV-CORE",
    description:
      "Four-week classroom and yard programme for taxi drivers entering EV operations in Kigali. Covers safety, vehicle systems, charging, passenger service, and the written/practical assessment.",
    duration_weeks: 4,
    status: "active",
    modules: [
      {
        name: "Programme orientation & safety",
        code: "M01",
        description: "Welcome, cohort rules, road safety, and high-voltage awareness.",
        content:
          "Opening week for the Tunga Taxi EV Driver Programme. Instructors introduce UZA Mobility, the cohort timetable, attendance rules, and the difference between this classroom and a typical driving school. Candidates leave able to describe high-voltage caution zones, fatigue limits, and what “fit for duty” means before they touch a vehicle.",
        contents: [
          {
            title: "Welcome, timetable, and conduct",
            body: "UZA Mobility purpose, daily start times, uniform and cabin presentation, phones in class, and how attendance is recorded. Late arrival after 15 minutes is marked late; two unexcused absences trigger an instructor review.",
            sort_order: 1,
          },
          {
            title: "Road safety in Kigali traffic",
            body: "Defensive spacing, motorcycle traffic, roundabouts, school zones, and night driving. Fatigue: no shift longer than the roster allows; report illness before roll call.",
            sort_order: 2,
          },
          {
            title: "EV and high-voltage awareness",
            body: "Instant torque, quiet approach, orange cabling, underbody packs, and never-touch rules after a collision. Candidates practise pointing out HV labels on a training vehicle.",
            sort_order: 3,
          },
        ],
        sort_order: 1,
        duration_hours: 8,
        attachments: [
          textFile(
            "M01-classroom-rules.txt",
            [
              "TUNGA TAXI — CLASSROOM & YARD RULES",
              "",
              "1. Be on the yard 10 minutes before roll call.",
              "2. Closed shoes; no loose jewellery near charging ports.",
              "3. Phones silent during instruction.",
              "4. Report damage or a warning light before the vehicle leaves the bay.",
              "5. High-voltage components are instructor-only unless briefed.",
              "6. Passengers are never left in a charging vehicle unattended.",
            ].join("\n"),
          ),
          textFile(
            "M01-hv-safety-brief.txt",
            [
              "HIGH-VOLTAGE SAFETY BRIEF",
              "",
              "- Orange cables and labels = do not touch.",
              "- After an incident: power off, evacuate, call the instructor, do not spray water on the pack.",
              "- Charging: dry hands, inspect the connector, lock the vehicle, stay with the cable until it latches.",
              "- If the vehicle smells sweet or the pack is hissing: move 15 m away and radio the yard.",
            ].join("\n"),
          ),
        ],
      },
      {
        name: "EV vehicle operations",
        code: "M02",
        description: "Daily checks, charging, range planning, and cabin readiness.",
        content:
          "Hands-on module. Candidates complete a walk-around, set cabin presentation, plug in on AC and observe a DC stop, and plan a Kigali shift around state of charge. Instructors sign off a daily-check sheet before any road circuit.",
        contents: [
          {
            title: "Pre-trip and cabin readiness",
            body: "Tyres, lights, wipers, charge port cap, cabin hygiene, child-lock, and in-app vehicle status. Record odometer and SOC at start of shift.",
            sort_order: 1,
          },
          {
            title: "Charging etiquette and range",
            body: "AC overnight vs DC mid-shift. Target 20–80% SOC for battery health unless the roster needs a full charge. Queueing at public chargers; never block a stall after 80% on DC.",
            sort_order: 2,
          },
          {
            title: "Faults, recovery, and towing",
            body: "What to do on a reduced-power warning, a failed charge session, or a flat. Tow points and who to call. Do not jump-start an HV pack.",
            sort_order: 3,
          },
        ],
        sort_order: 2,
        duration_hours: 16,
        attachments: [
          textFile(
            "M02-daily-vehicle-checklist.txt",
            [
              "DAILY EV TAXI CHECKLIST",
              "",
              "[ ] Exterior walk-around (dents, lights, charge flap)",
              "[ ] Tyre pressure and tread",
              "[ ] Cabin clean, no personal items in passenger area",
              "[ ] SOC recorded (start): ______ %",
              "[ ] Odometer recorded: ______ km",
              "[ ] Charging cable and port dry / undamaged",
              "[ ] Warning lights: none / reported: ________",
              "[ ] Instructor initials: ______",
            ].join("\n"),
          ),
          textFile(
            "M02-charging-sop.txt",
            [
              "CHARGING STANDARD OPERATING PROCEDURE",
              "",
              "1. Park, apply park, switch off HVAC if the site requires it.",
              "2. Inspect inlet and connector. Do not use a damaged cable.",
              "3. Plug in, wait for the latch, confirm kW on the screen.",
              "4. Stay with the vehicle until charging is confirmed.",
              "5. On DC, unplug at the instructed SOC (usually 80%).",
              "6. Coil the cable, close the flap, log kWh in the trip book.",
            ].join("\n"),
          ),
        ],
      },
      {
        name: "Passenger service & digital tools",
        code: "M03",
        description: "Professional service, accessibility, trip apps, and cashless payments.",
        content:
          "Soft skills plus the tools drivers use on shift. Greeting scripts, destination confirmation, accessibility, de-escalation, and keeping a clean digital trip record that the programme can audit.",
        contents: [
          {
            title: "Greeting, routing, and accessibility",
            body: "Door, greeting, destination repeat-back, AC and music. Helping passengers with luggage or reduced mobility without rushing. Child seats: follow programme policy.",
            sort_order: 1,
          },
          {
            title: "Conflict handling",
            body: "Fare disputes, wrong pin, and route disagreement. Stay parked, keep the meter/app visible, call the instructor or operations if a passenger becomes aggressive.",
            sort_order: 2,
          },
          {
            title: "Apps, payments, and trip records",
            body: "Accepting trips, navigation, cashless flow, receipts, and why incomplete trips delay graduation and financing files.",
            sort_order: 3,
          },
        ],
        sort_order: 3,
        duration_hours: 8,
        attachments: [
          textFile(
            "M03-passenger-service-script.txt",
            [
              "PASSENGER SERVICE SCRIPT",
              "",
              "Arrival: “Good morning, I am [name] with Tunga Taxi. Going to [destination]?”",
              "Confirm: repeat the pin or landmark. Offer help with bags.",
              "During: quiet cabin unless the passenger starts conversation.",
              "End: “We have arrived. Here is your receipt. Thank you.”",
              "If lost: pull over safely, check the map together, do not argue.",
            ].join("\n"),
          ),
        ],
      },
      {
        name: "Business readiness",
        code: "M04",
        description: "Shift economics, savings habits, and documents needed after graduation.",
        content:
          "Connects classroom performance to work after graduation: estimating a week of trips, keeping a simple savings log, and assembling identity and training documents the programme will need. This is not a bank product module — it is file readiness.",
        contents: [
          {
            title: "Shift economics",
            body: "Hours, utilisation, charging cost vs fuel, and why attendance and exam scores sit on the candidate file.",
            sort_order: 1,
          },
          {
            title: "Document pack",
            body: "National ID, proof of address, training certificate, and any programme forms. Missing papers delay graduation sign-off.",
            sort_order: 2,
          },
        ],
        sort_order: 4,
        duration_hours: 6,
        attachments: [
          textFile(
            "M04-document-checklist.txt",
            [
              "GRADUATION DOCUMENT PACK",
              "",
              "[ ] National ID (copy)",
              "[ ] Proof of address",
              "[ ] Emergency contact",
              "[ ] Training attendance record (from dashboard)",
              "[ ] Exam score recorded",
              "[ ] Instructor sign-off",
            ].join("\n"),
          ),
        ],
      },
      {
        name: "Assessment & graduation",
        code: "M05",
        description: "Practical drive, charging demo, written exam, and completion briefing.",
        content:
          "Final week. Candidates complete an observed circuit, a charging demonstration, and a short written exam. Staff set status to graduated only after both practical and exam meet the pass mark. Certificates are printed from the candidate file.",
        contents: [
          {
            title: "Practical assessment",
            body: "Walk-around, yard manoeuvre, Kigali circuit, charging demo, passenger-service checklist. Instructor records pass/fail with comments.",
            sort_order: 1,
          },
          {
            title: "Written exam and briefing",
            body: "Safety, charging, and service questions. Review scores, remaining absences, and next steps. No automatic pass — staff decide.",
            sort_order: 2,
          },
        ],
        sort_order: 5,
        duration_hours: 8,
        attachments: [
          textFile(
            "M05-practical-rubric.txt",
            [
              "PRACTICAL ASSESSMENT RUBRIC",
              "",
              "Walk-around & cabin        /10",
              "Charging demonstration     /10",
              "Yard control               /10",
              "On-road observation        /40",
              "Passenger service          /20",
              "Professional conduct       /10",
              "",
              "Pass mark: 70 / 100. Critical fail: any HV safety breach.",
            ].join("\n"),
          ),
        ],
      },
    ],
  },
  {
    name: "Customer service & professionalism",
    code: "TT-SVC",
    description:
      "One-week complement to the core EV programme: first impressions, accessibility, and digital payments for Kigali taxi work.",
    duration_weeks: 1,
    status: "active",
    modules: [
      {
        name: "Passenger experience",
        code: "S01",
        description: "Greeting, routing, accessibility, and conflict handling.",
        content:
          "Focused service module for drivers who already know the vehicle. Role-play first impressions, accessibility, and fare disputes until the script is automatic.",
        contents: [
          {
            title: "First impressions",
            body: "Cabin, greeting, destination confirmation, and offering help without being intrusive.",
            sort_order: 1,
          },
          {
            title: "Accessibility and de-escalation",
            body: "Passengers with mobility needs, language barriers, and staying parked during a dispute.",
            sort_order: 2,
          },
        ],
        sort_order: 1,
        duration_hours: 6,
        attachments: [
          textFile(
            "S01-roleplay-cards.txt",
            [
              "ROLE-PLAY CARDS",
              "",
              "1. Passenger is late and angry about traffic.",
              "2. Pin is in a one-way street.",
              "3. Passenger asks to stop at an ATM mid-trip.",
              "4. Fare shown on the app does not match their expectation.",
              "5. Passenger has a folding wheelchair.",
            ].join("\n"),
          ),
        ],
      },
      {
        name: "Digital tools & payments",
        code: "S02",
        description: "Trip apps, cashless payments, and clean records.",
        content:
          "Practical lab: accept a dummy trip, complete cashless payment, issue a receipt, and explain a failed payment without leaving the vehicle in gear.",
        contents: [
          {
            title: "App usage",
            body: "Accept, navigate, report a no-show, and end a trip correctly.",
            sort_order: 1,
          },
          {
            title: "Payments and records",
            body: "Cashless flow, receipts, and why the candidate file needs a complete trip history.",
            sort_order: 2,
          },
        ],
        sort_order: 2,
        duration_hours: 4,
        attachments: [
          textFile(
            "S02-payment-faults.txt",
            [
              "PAYMENT FAULTS — WHAT TO SAY",
              "",
              "Card declined: stay parked, offer to retry once, then ask for another method.",
              "App freeze: screenshot if possible, radio operations, do not guess the fare.",
              "Passenger walks away: log no-show, do not chase.",
            ].join("\n"),
          ),
        ],
      },
    ],
  },
];

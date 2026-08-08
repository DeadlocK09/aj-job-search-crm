/**
 * CareerFlow
 * Configuration
 */

const CONFIG = {

  SHEETS: {

    APPLICATIONS: "Applications",
    DASHBOARD: "Dashboard",
    COMPANIES: "Companies",
    CONTACTS: "Contacts",
    INTERVIEWS: "Interviews",
    LOGS: "Logs"

  },

  STATUS: {

    APPLIED: "Applied",
    INTERVIEW: "Interview",
    ASSESSMENT: "Assessment",
    HR_INTERVIEW: "HR Interview",
    TECHNICAL_INTERVIEW: "Technical Interview",
    FINAL_INTERVIEW: "Final Interview",
    OFFER: "Offer",
    ACCEPTED: "Accepted",
    REJECTED: "Rejected",
    WITHDRAWN: "Withdrawn"

  },

  STATUS_VALUES: [
    "Applied",
    "Assessment",
    "Interview",
    "HR Interview",
    "Technical Interview",
    "Final Interview",
    "Offer",
    "Accepted",
    "Rejected",
    "Withdrawn"
  ],

  PLATFORMS: [
    "LinkedIn",
    "JobStreet",
    "Indeed",
    "Company Website",
    "Referral",
    "Other"
  ],

  WORK_TYPES: [
    "Remote",
    "Hybrid",
    "On-site"
  ],

  CLOSED_STATUSES: [
    "Accepted",
    "Rejected",
    "Withdrawn"
  ],

  PROPERTIES: {
    LAST_APPLICATION_SEQUENCE:
      "LAST_APPLICATION_SEQUENCE"
  },

  GMAIL: {
    SEARCH_QUERY: [
      "newer_than:90d",
      "-in:spam",
      "-in:trash",
      "-in:sent",
      "{",
      'subject:"application received"',
      'subject:"application submitted"',
      'subject:"application confirmation"',
      'subject:"thank you for applying"',
      'subject:"we received your application"',
      'subject:"your application"',
      "}"
    ].join(" "),
    MAX_THREADS: 50,
    MAX_MESSAGES: 100,
    MIN_CONFIDENCE: 60
  },

  TIME_ZONE: "Asia/Manila",

  ID_PREFIX: "APP",

  VERSION: "1.2.0"

};

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
      "LAST_APPLICATION_SEQUENCE",
    SPREADSHEET_ID:
      "CAREERFLOW_SPREADSHEET_ID",
    GMAIL_NOTIFICATION_EMAIL:
      "GMAIL_NOTIFICATION_EMAIL",
    GMAIL_SCHEDULED_SINCE:
      "GMAIL_SCHEDULED_SINCE",
    GMAIL_SCHEDULE_TRIGGER_ID:
      "GMAIL_SCHEDULE_TRIGGER_ID",
    GMAIL_LAST_SCHEDULED_RESULT:
      "GMAIL_LAST_SCHEDULED_RESULT"
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
    MIN_CONFIDENCE: 60,
    SCHEDULE_HANDLER: "runScheduledGmailScan",
    SCHEDULE_HOUR: 8,
    NOTIFICATION_MAX_ITEMS: 10
  },

  TIME_ZONE: "Asia/Manila",

  ID_PREFIX: "APP",

  VERSION: "1.3.0"

};

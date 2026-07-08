-- ============================================================================
-- CASE
-- ============================================================================

CREATE TABLE "CASE" (
    case_no                VARCHAR(15)  NOT NULL,
    "type"                 VARCHAR(20)  NOT NULL,
    "Category"             VARCHAR(30)  NOT NULL,
    "Jurisdiction_Type"    VARCHAR(30)  NOT NULL,
    "Name"                 VARCHAR(100) NOT NULL,
    "Description"          TEXT,
    curr_status            VARCHAR(20)  NOT NULL,

    CONSTRAINT pk_case
        PRIMARY KEY (case_no)
);

-- ============================================================================
-- LAWYER
-- ============================================================================

CREATE TABLE "LAWYER" (
    "BAR_Registration_No"  VARCHAR(20)  NOT NULL,
    "Qualification"        VARCHAR(100) NOT NULL,
    "Specialization"       VARCHAR(100) NOT NULL,
    "Phone_No"             VARCHAR(15)  NOT NULL,
    "Email"                VARCHAR(50)  NOT NULL,
    "Office_Address"       TEXT,
    "Experience"           TEXT,
    "Status"               VARCHAR(20)  NOT NULL,

    CONSTRAINT pk_lawyer
        PRIMARY KEY ("BAR_Registration_No"),

    CONSTRAINT uq_lawyer_email
        UNIQUE ("Email"),

    CONSTRAINT uq_lawyer_phone
        UNIQUE ("Phone_No")
);

-- ============================================================================
-- JUDGE
-- ============================================================================

CREATE TABLE "JUDGE" (
    "ID"              INT          NOT NULL,
    "Name"            VARCHAR(100) NOT NULL,
    "Gender"          VARCHAR(15)  NOT NULL,
    "DOB"             DATE         NOT NULL,
    "Email"           VARCHAR(50)  NOT NULL,
    "Status"          VARCHAR(20)  NOT NULL,
    "Phone_No"        VARCHAR(15)  NOT NULL,
    "Address"         TEXT,
    "Position"        VARCHAR(30)  NOT NULL,
    "Qualification"   VARCHAR(50)  NOT NULL,
    "Experience"      VARCHAR(50),

    CONSTRAINT pk_judge
        PRIMARY KEY ("ID"),

    CONSTRAINT uq_judge_email
        UNIQUE ("Email"),

    CONSTRAINT uq_judge_phone
        UNIQUE ("Phone_No")
);

-- ============================================================================
-- COURT
-- ============================================================================

CREATE TABLE "COURT" (
    "ID"           INT         NOT NULL,
    "Location"     TEXT        NOT NULL,
    "Level"        VARCHAR(20) NOT NULL,
    "Pin_Code"     INT         NOT NULL,
    "Email"        VARCHAR(50) NOT NULL,
    "Phone_No"     VARCHAR(15) NOT NULL,

    CONSTRAINT pk_court
        PRIMARY KEY ("ID"),

    CONSTRAINT uq_court_email
        UNIQUE ("Email"),

    CONSTRAINT uq_court_phone
        UNIQUE ("Phone_No")
);

-- ============================================================================
-- LITIGANTS
-- ============================================================================

CREATE TABLE "LITIGANTS" (
    "ID"         VARCHAR(20)  NOT NULL,
    "Name"       VARCHAR(100) NOT NULL,
    "Type"       VARCHAR(30)  NOT NULL,
    "Address"    TEXT,
    "Phone"      VARCHAR(15)  NOT NULL,
    "Email"      VARCHAR(50)  NOT NULL,
    "Gender"     VARCHAR(10),

    CONSTRAINT pk_litigants
        PRIMARY KEY ("ID"),

    CONSTRAINT uq_litigants_email
        UNIQUE ("Email"),

    CONSTRAINT uq_litigants_phone
        UNIQUE ("Phone")
);

-- ============================================================================
-- PANEL
-- ============================================================================

CREATE TABLE "PANEL" (
    "ID"            INT         NOT NULL,
    "type"          VARCHAR(30) NOT NULL,
    form_date       DATE        NOT NULL,
    dissolve_date   DATE,

    CONSTRAINT pk_panel
        PRIMARY KEY ("ID")
);

-- ============================================================================
-- FILING_DETAILS
-- ============================================================================

CREATE TABLE "FILING_DETAILS" (
    "ID"                 VARCHAR(15) NOT NULL,
    "Registration_date"  DATE        NOT NULL,
    "filing_mode"        VARCHAR(50) NOT NULL,
    case_no              VARCHAR(15) NOT NULL,

    CONSTRAINT pk_filing_details
        PRIMARY KEY ("ID"),

    CONSTRAINT fk_filing_case
        FOREIGN KEY (case_no)
        REFERENCES "CASE" (case_no)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

-- ============================================================================
-- CASE_STATUS
-- ============================================================================

CREATE TABLE "CASE_STATUS" (
    "Status_ID"       VARCHAR(15) NOT NULL,
    case_no           VARCHAR(15) NOT NULL,
    status            VARCHAR(20) NOT NULL,
    curr_stage        VARCHAR(30) NOT NULL,
    is_dormant        BOOLEAN     NOT NULL,
    dormant_reason    TEXT,

    CONSTRAINT pk_case_status
        PRIMARY KEY ("Status_ID"),

    CONSTRAINT fk_case_status_case
        FOREIGN KEY (case_no)
        REFERENCES "CASE" (case_no)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

-- ============================================================================
-- JUDGEMENT
-- ============================================================================

CREATE TABLE "JUDGEMENT" (
    "ID"                          VARCHAR(25) NOT NULL,
    "Decision_date"               DATE        NOT NULL,
    verdict                       TEXT        NOT NULL,
    compensations                 TEXT,
    sentence_length_punishment    TEXT,
    remark                        TEXT,
    case_no                       VARCHAR(15) NOT NULL,
    panel_id                      INT,

    CONSTRAINT pk_judgement
        PRIMARY KEY ("ID"),

    CONSTRAINT fk_judgement_case
        FOREIGN KEY (case_no)
        REFERENCES "CASE" (case_no)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT fk_judgement_panel
        FOREIGN KEY (panel_id)
        REFERENCES "PANEL" ("ID")
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

-- ============================================================================
-- EVIDENCE
-- ============================================================================

CREATE TABLE "EVIDENCE" (
    "ID"                 INT         NOT NULL,
    "Type"               VARCHAR(20) NOT NULL,
    "Description"        TEXT,
    "Submission_date"    DATE        NOT NULL,
    "Verified_Status"    BOOLEAN     NOT NULL,
    case_no              VARCHAR(15) NOT NULL,

    CONSTRAINT pk_evidence
        PRIMARY KEY ("ID"),

    CONSTRAINT fk_evidence_case
        FOREIGN KEY (case_no)
        REFERENCES "CASE" (case_no)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

-- ============================================================================
-- WARRANT
-- ============================================================================

CREATE TABLE "WARRANT" (
    "ID"            VARCHAR(15) NOT NULL,
    "Type"          VARCHAR(20) NOT NULL,
    "Issue_Date"    TIMESTAMP   NOT NULL,
    "Exp_date"      TIMESTAMP,
    "Status"        VARCHAR(20) NOT NULL,
    case_no         VARCHAR(15) NOT NULL,

    CONSTRAINT pk_warrant
        PRIMARY KEY ("ID"),

    CONSTRAINT fk_warrant_case
        FOREIGN KEY (case_no)
        REFERENCES "CASE" (case_no)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

-- ============================================================================
-- DOCUMENT_REPO
-- ============================================================================

CREATE TABLE "DOCUMENT_REPO" (
    "ID"                   VARCHAR(20) NOT NULL,
    "Name"                 VARCHAR(50) NOT NULL,
    "Type"                 VARCHAR(20) NOT NULL,
    "Link"                 TEXT        NOT NULL,
    "BAR_Registration_No"  VARCHAR(20),
    case_no                VARCHAR(15),

    CONSTRAINT pk_document_repo
        PRIMARY KEY ("ID"),

    CONSTRAINT fk_docrepo_lawyer
        FOREIGN KEY ("BAR_Registration_No")
        REFERENCES "LAWYER" ("BAR_Registration_No")
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT fk_document_repo_case
        FOREIGN KEY (case_no)
        REFERENCES "CASE" (case_no)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

-- ============================================================================
-- HEARING
-- ============================================================================

CREATE TABLE "HEARING" (
    "Hearing_No"    INT         NOT NULL,
    case_no         VARCHAR(15) NOT NULL,
    court_id        INT         NOT NULL,
    "Type"          VARCHAR(20) NOT NULL,
    "Status"        VARCHAR(20) NOT NULL,

    CONSTRAINT pk_hearing
        PRIMARY KEY ("Hearing_No"),

    CONSTRAINT fk_hearing_case
        FOREIGN KEY (case_no)
        REFERENCES "CASE" (case_no)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_hearing_court
        FOREIGN KEY (court_id)
        REFERENCES "COURT" ("ID")
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

-- ============================================================================
-- HEARING_TRANSCRIPT
-- ============================================================================

CREATE TABLE "HEARING_TRANSCRIPT" (
    "ID"            INT  NOT NULL,
    "Hearing_no"    INT  NOT NULL,
    "Text"          TEXT NOT NULL,
    recorded_by     INT  NOT NULL,
    court_id        INT  NOT NULL,
    "Time_stamp"    TIME NOT NULL,

    CONSTRAINT pk_hearing_transcript
        PRIMARY KEY ("Hearing_no", "ID"),

    CONSTRAINT fk_ht_hearing
        FOREIGN KEY ("Hearing_no")
        REFERENCES "HEARING" ("Hearing_No")
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_ht_judge
        FOREIGN KEY (recorded_by)
        REFERENCES "JUDGE" ("ID")
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT fk_ht_court
        FOREIGN KEY (court_id)
        REFERENCES "COURT" ("ID")
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

-- ============================================================================
-- HANDLED_BY
-- ============================================================================

CREATE TABLE "HANDLED_BY" (
    "BAR_Registration_No"  VARCHAR(20) NOT NULL,
    case_no                VARCHAR(15) NOT NULL,

    CONSTRAINT pk_handled_by
        PRIMARY KEY ("BAR_Registration_No", case_no),

    CONSTRAINT fk_hb_lawyer
        FOREIGN KEY ("BAR_Registration_No")
        REFERENCES "LAWYER" ("BAR_Registration_No")
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_hb_case
        FOREIGN KEY (case_no)
        REFERENCES "CASE" (case_no)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

-- ============================================================================
-- PARTICIPATES_IN
-- ============================================================================

CREATE TABLE "PARTICIPATES_IN" (
    litigant_id   VARCHAR(20) NOT NULL,
    case_no       VARCHAR(15) NOT NULL,

    CONSTRAINT pk_participates_in
        PRIMARY KEY (litigant_id, case_no),

    CONSTRAINT fk_pi_litigant
        FOREIGN KEY (litigant_id)
        REFERENCES "LITIGANTS" ("ID")
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_pi_case
        FOREIGN KEY (case_no)
        REFERENCES "CASE" (case_no)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

-- ============================================================================
-- WORKS_FOR
-- ============================================================================

CREATE TABLE "WORKS_FOR" (
    judge_id   INT NOT NULL,
    court_id   INT NOT NULL,

    CONSTRAINT pk_works_for
        PRIMARY KEY (judge_id, court_id),

    CONSTRAINT fk_wf_judge
        FOREIGN KEY (judge_id)
        REFERENCES "JUDGE" ("ID")
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_wf_court
        FOREIGN KEY (court_id)
        REFERENCES "COURT" ("ID")
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

-- ============================================================================
-- HANDLES
-- ============================================================================

CREATE TABLE "HANDLES" (
    court_id   INT         NOT NULL,
    case_no    VARCHAR(15) NOT NULL,

    CONSTRAINT pk_handles
        PRIMARY KEY (court_id, case_no),

    CONSTRAINT fk_han_court
        FOREIGN KEY (court_id)
        REFERENCES "COURT" ("ID")
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_han_case
        FOREIGN KEY (case_no)
        REFERENCES "CASE" (case_no)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

-- ============================================================================
-- FORMS
-- ============================================================================

CREATE TABLE "FORMS" (
    judge_id   INT NOT NULL,
    panel_id   INT NOT NULL,

    CONSTRAINT pk_forms
        PRIMARY KEY (judge_id, panel_id),

    CONSTRAINT fk_forms_judge
        FOREIGN KEY (judge_id)
        REFERENCES "JUDGE" ("ID")
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_forms_panel
        FOREIGN KEY (panel_id)
        REFERENCES "PANEL" ("ID")
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

-- ============================================================================
-- HEARD_BY
-- ============================================================================

CREATE TABLE "HEARD_BY" (
    hearing_no   INT NOT NULL,
    panel_id     INT NOT NULL,

    CONSTRAINT pk_heard_by
        PRIMARY KEY (hearing_no, panel_id),

    CONSTRAINT fk_hb_hearing
        FOREIGN KEY (hearing_no)
        REFERENCES "HEARING" ("Hearing_No")
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_hb_panel
        FOREIGN KEY (panel_id)
        REFERENCES "PANEL" ("ID")
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

-- ============================================================================
-- IS_PRECEDENT
-- ============================================================================

CREATE TABLE "IS_PRECEDENT" (
    case_no             VARCHAR(15) NOT NULL,
    precedent_case_no   VARCHAR(15) NOT NULL,

    CONSTRAINT pk_is_precedent
        PRIMARY KEY (case_no, precedent_case_no),

    CONSTRAINT fk_ip_case
        FOREIGN KEY (case_no)
        REFERENCES "CASE" (case_no)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_ip_precedent
        FOREIGN KEY (precedent_case_no)
        REFERENCES "CASE" (case_no)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);
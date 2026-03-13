'use client';
import React, { useState, useEffect } from 'react';
import interviewData from '../interview_questions.json';
import { FileText, Briefcase, Download, Save, Trash2, Plus, Upload, FolderDown, Edit2, X, Check, Copy, Lightbulb, ShieldCheck, BarChart3, History, Zap, Loader2, FileUp } from 'lucide-react';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
import { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle, convertInchesToTwip } from 'docx';
import { saveAs } from 'file-saver';

const ResumeCustomizer = () => {
  const [step, setStep] = useState('loading');
  const [profileData, setProfileData] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [tailoringGuidance, setTailoringGuidance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [savedApplications, setSavedApplications] = useState([]);
  const [learnedSkills, setLearnedSkills] = useState({});
  const [skillsSeeded, setSkillsSeeded] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedProfile, setEditedProfile] = useState({ resumeText: '', linkedInUrl: '' });
  const [hallucinationReport, setHallucinationReport] = useState(null);
  const [atsScore, setAtsScore] = useState(null);
  const [atsSource, setAtsSource] = useState(null); // 'base' or 'tailored'
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [existingJobs, setExistingJobs] = useState([]);
  const [currentJobId, setCurrentJobId] = useState(null);
  const [amplifiedGuidance, setAmplifiedGuidance] = useState(null);
  const [amplifyLoading, setAmplifyLoading] = useState(false);
  const [showAmplified, setShowAmplified] = useState(false);
  const [useHybridFormat, setUseHybridFormat] = useState(false);
  const [tailoredResumeText, setTailoredResumeText] = useState(null);
  const [resumeDownloaded, setResumeDownloaded] = useState(false);
  const [savedToTracker, setSavedToTracker] = useState(false);
  const MAX_SAVED_APPLICATIONS = 20;
  
  const VOICE_PROFILE = `
VOICE PROFILE — apply this to all generated text, no exceptions:

WRITING STYLE:
- Direct and specific. Lead with facts, not enthusiasm.
- Short sentences. Cut anything that doesn't add information.
- Own the work: "I built", "I owned", "I designed" — not "assisted with" or "contributed to."
- Concrete over abstract. Name the actual thing that happened.
- Numbers need context. Don't just say "30% reduction" — say what that means day-to-day.

BANNED PHRASES — never use these:
deeply resonates, proven track record, results-driven, passionate about,
I would welcome the opportunity, leveraged (when meaning "used"),
synergies, dynamic environment, fast-paced, thought leader,
excited to contribute, thrilled to apply, collaborative team player,
I am confident that, I believe I would be a great fit,
Throughout my career, I am writing to express my interest,
any sentence starting with "I am excited to",
Known for owning, Known for, Recognized for, Renowned for,
time-of-day references (e.g. "3 AM", "late nights", "after hours"),
"I own the problems", colloquialisms in the professional summary

FRAMING PRINCIPLES:
- Never use "Known for [verb]" constructions. Describe the work directly instead.
- The professional summary must sound like a senior engineer wrote it — direct and specific but professional. Not casual, not a blog post, not trying to be clever.

TONE CALIBRATION:
BAD:  "I am excited to apply and believe my background aligns perfectly with your needs."
GOOD: "Here's what 20 years of keeping infrastructure running actually looks like."

BAD:  "Leveraged cross-functional partnerships to drive operational efficiency."
GOOD: "Worked with compliance to map their audit workflow, then automated the manual parts. Cut prep time by ~40%."

SUMMARY TONE:
BAD:  "I own the problems that break at 3 AM and fix them fast."
GOOD: "20+ years designing and operating enterprise network infrastructure. Deep expertise in BGP/OSPF routing, Palo Alto firewalls, and multi-cloud connectivity. Consistent record of improving reliability and reducing operational overhead."
`;

  useEffect(() => {
    initializeApp();
  }, []);

  const getDefaultProfile = () => ({
    resumeText: '',
    linkedInUrl: ''
  });

  const loadStorage = async () => {
    const response = await fetch('/api/storage', { cache: 'no-store' });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data?.error || 'Failed to load data');
    }
    return response.json();
  };

  const saveStorage = async (data) => {
    const response = await fetch('/api/storage', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error || 'Failed to save data');
    }
  };

  const migrateLocalStorageData = () => {
    if (typeof window === 'undefined') {
      return null;
    }

    const profileRaw = window.localStorage.getItem('resume_profile');
    const appsRaw = window.localStorage.getItem('saved_applications');
    const skillsRaw = window.localStorage.getItem('learned_skills');
    const seedRaw = window.localStorage.getItem('skills_seeded');

    if (!profileRaw && !appsRaw && !skillsRaw) {
      return null;
    }

    let migratedProfile = null;
    let migratedApps = [];
    let migratedSkills = {};

    try {
      if (profileRaw) {
        migratedProfile = JSON.parse(profileRaw);
      }
      if (appsRaw) {
        migratedApps = JSON.parse(appsRaw);
      }
      if (skillsRaw) {
        migratedSkills = JSON.parse(skillsRaw);
      }
    } catch (error) {
      console.warn('Failed to parse legacy localStorage data:', error);
      return null;
    }

    window.localStorage.removeItem('resume_profile');
    window.localStorage.removeItem('saved_applications');
    window.localStorage.removeItem('learned_skills');
    window.localStorage.removeItem('skills_seeded');

    return {
      profile: migratedProfile,
      savedApplications: Array.isArray(migratedApps) ? migratedApps : [],
      learnedSkills: migratedSkills && typeof migratedSkills === 'object' ? migratedSkills : {},
      skillsSeeded: seedRaw === 'true',
    };
  };

  const initializeApp = async () => {
    let storedData = null;
    try {
        storedData = await loadStorage();
    } catch (error) {
        console.error('Failed to load storage, using defaults:', error);
    }

    const legacyData = !storedData?.profile ? migrateLocalStorageData() : null;
    const sourceData = legacyData || storedData || {};

    let nextLearnedSkills =
      sourceData?.learnedSkills && typeof sourceData.learnedSkills === 'object'
        ? sourceData.learnedSkills
        : {};
    let nextSkillsSeeded = Boolean(sourceData?.skillsSeeded);

    if (!nextSkillsSeeded) {
      interviewData.interview_prep_clean_versions.forEach(({ question, clean_60_second_version }) => {
        nextLearnedSkills[question] = clean_60_second_version;
      });
      nextSkillsSeeded = true;
    }

    const nextProfile = sourceData?.profile || getDefaultProfile();
    const nextApps = Array.isArray(sourceData?.savedApplications) ? sourceData.savedApplications : [];

    setProfileData(nextProfile);
    setSavedApplications(nextApps);
    setLearnedSkills(nextLearnedSkills);
    setSkillsSeeded(nextSkillsSeeded);
    setStep(nextProfile.resumeText?.trim() ? 'input' : 'setup');

    // Save in background — don't block UI or wipe state on failure
    try {
      await saveStorage({
        profile: nextProfile,
        savedApplications: nextApps,
        learnedSkills: nextLearnedSkills,
        skillsSeeded: nextSkillsSeeded,
      });
    } catch (error) {
      console.error('Failed to persist initial state:', error);
    }
  };

  // ─── CHANGE 1: Enhanced gap analysis prompt ───────────────────────────────
  // Added: named platform detection, timeline gap flagging, topic deduplication
  const analyzeJobDescription = async () => {
    if (!jobDescription.trim()) {
        alert('Please paste a job description first');
        return;
    }

    // Duplicate job detection
    try {
      const jobsRes = await fetch('/api/jobs');
      const existingJobsList = await jobsRes.json();
      if (Array.isArray(existingJobsList)) {
        setExistingJobs(existingJobsList);
      }
    } catch (e) {
      console.warn('Could not check for duplicate jobs:', e.message);
    }

    setLoading(true);

    let jobContext = jobDescription;
    try {
      const summarizeRes = await fetch('/api/summarize-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription })
      });
      const { requirements } = await summarizeRes.json();
      if (requirements?.length) {
        jobContext = `Key requirements extracted from job posting:\n${requirements.join('\n')}`;
        console.log(`[summarize-job] compressed: ${jobDescription.length} chars -> ${jobContext.length} chars using ${requirements.length} requirements`);
      } else {
        console.warn('[summarize-job] empty requirements returned, using full JD');
      }
    } catch (e) {
      console.warn('[summarize-job] Ollama unavailable, using full JD:', e.message);
    }

    try {
        let previouslyAskedQuestions = [];

        savedApplications.forEach(app => {
          if (app.questions) {
            previouslyAskedQuestions.push(...app.questions);
          }
        });

        const response = await fetch('/api/anthropic/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1000,
            messages: [{
            role: 'user',
            content: `Analyze a job posting against a candidate profile to find gaps.

CANDIDATE PROFILE:
${profileData.resumeText}

LEARNED SKILLS/EXPERIENCES:
${Object.keys(learnedSkills).length > 0 ? JSON.stringify(learnedSkills, null, 2) : 'None'}

TOPICS ALREADY EXPLORED (do NOT ask about these again, even with different wording):
${previouslyAskedQuestions.length > 0 ? previouslyAskedQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n') : 'None'}

JOB POSTING:
${jobContext}

Find 3-5 critical requirements that are:
1. Explicitly required in the job posting
2. NOT covered by the candidate's profile or learned skills
3. NOT substantially similar in topic to any previously explored question above — compare by TOPIC, not exact wording. If the same underlying skill or experience has been explored before, skip it entirely.
4. Genuinely new information that would strengthen the application

Also check for these two additional gap types:
5. PLATFORM GAPS: If the JD explicitly names platforms (e.g. Google Workspace, Slack, Salesforce, Jira, Notion) that are NOT mentioned by name anywhere in the candidate's profile or skills, flag each as a gap — even if similar tools are present.
6. TIMELINE GAPS: If there are unexplained gaps of 6+ months between roles in the candidate's work history, flag the gap period with a question asking how they spent that time (e.g. consulting, caregiving, personal project, travel). Only flag gaps that are not already explained in the profile.

Your response must be ONLY a valid JSON array — no explanation, no prose, no markdown. Start your response with [ and end with ].

Each item must follow this exact shape:
{"skill": "requirement name", "question": "question to ask", "why": "why this matters", "type": "skill|platform|timeline"}

If there are gaps: [{"skill": "...", "question": "...", "why": "...", "type": "..."}, ...]
If all gaps are covered: []`
            }]
            })
        });

        const data = await response.json();
        const text = data.content.map(item => item.type === 'text' ? item.text : '').join('');
        const match = text.match(/\[[\s\S]*\]/);
        if (!match) {
          setQuestions([]);
          setStep('questions');
          return;
        }
        const parsedQuestions = JSON.parse(match[0]);
        
        setQuestions(parsedQuestions);
        setStep('questions');
    } catch (error) {
        console.error('Analysis error:', error);
        alert('Failed to analyze job description. Please try again.');
    } finally {
        setLoading(false);
    }
    };

  // ─── CHANGE 2: generateGuidance now also returns suggestedTitle ───────────
  const generateGuidance = async () => {
    setLoading(true);
    
    try {
      const updatedLearnedSkills = { ...learnedSkills };

      Object.entries(answers).forEach(([question, answer]) => {
        const q = questions.find(q => q.question === question);
        if (q && answer.trim()) {
          updatedLearnedSkills[q.skill] = answer;
        }
      });

      const response = await fetch('/api/anthropic/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          messages: [{
            role: 'user',
            content: `Provide resume tailoring guidance.

JOB POSTING:
${jobDescription}

CANDIDATE PROFILE:
${profileData.resumeText}

ADDITIONAL QUALIFICATIONS:
${Object.keys(updatedLearnedSkills).length > 0 ? Object.entries(updatedLearnedSkills).map(([skill, exp]) => `${skill}: ${exp}`).join('\n') : 'None'}

${VOICE_PROFILE}

Provide specific guidance as JSON with this exact shape:
{
  "suggestedTitle": "A single realistic job title. No slashes or compound titles.",
  "companyName": "The hiring company name from the job posting",
  "keyPhrases": ["keyword1", "keyword2"],
  "experiencesToHighlight": ["specific experience to emphasize"],
  "skillsToAdd": ["skill from additional qualifications"],
  "summaryGuidance": "Give a specific 2-3 sentence draft of the summary itself, not instructions about it. Write it in the candidate's voice per the voice profile above.",
  "bulletPointExamples": ["example bullet using their actual experience — specific, no filler"]
}

For bulletPointExamples: write bullets the way the candidate actually talks. Name the real thing. Include a number only if it has context. No "leveraged", no "spearheaded", no "drove initiatives".`
          }]
        })
      });

      const data = await response.json();
      const text = data.content.map(item => item.type === 'text' ? item.text : '').join('');
      const clean = text.replace(/```json|```/g, '').trim();
      const guidance = JSON.parse(clean);

      // Duplicate job detection using guidance-derived company/title
      const isDuplicate = existingJobs.some(
        j =>
          j.company?.toLowerCase().trim() === (guidance.companyName || '').toLowerCase().trim() &&
          j.jobTitle?.toLowerCase().trim() === (guidance.suggestedTitle || '').toLowerCase().trim() &&
          j.status !== 'Withdrawn'
      );

      if (isDuplicate) {
        const proceed = confirm(
          `⚠️ You already have an active application for "${guidance.suggestedTitle}" at ${guidance.companyName}.\n\nContinue anyway?`
        );
        if (!proceed) {
          setLoading(false);
          return;
        }
      }

      setTailoringGuidance(guidance);

      // Run initial ATS score against base resume so user sees it immediately
      const initialAts = computeAtsScore(profileData.resumeText);
      setAtsScore(initialAts);
      setAtsSource('base');

      const newApp = {
        id: Date.now(),
        date: new Date().toISOString(),
        jobTitle: guidance.suggestedTitle || jobDescription.split('\n')[0].substring(0, 100),
        company: guidance.companyName || '',
        questions: questions.map(q => q.question),
        answers: answers,
        guidance: guidance
      };
      
      const updatedApps = [...savedApplications, newApp].slice(-MAX_SAVED_APPLICATIONS);
      setSavedApplications(updatedApps);
      setLearnedSkills(updatedLearnedSkills);
      await saveStorage({
        profile: profileData,
        savedApplications: updatedApps,
        learnedSkills: updatedLearnedSkills,
        skillsSeeded,
      });

      // Create job record in pipeline
      let jobId = String(Date.now());
      try {
        const jobRes = await fetch('/api/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: jobId,
            company: guidance.companyName || '',
            jobTitle: guidance.suggestedTitle || jobDescription.split('\n')[0].substring(0, 100),
            status: 'Applied',
            appliedDate: new Date().toISOString().split('T')[0],
            keyPhrases: guidance.keyPhrases || [],
            jobDescriptionSnippet: jobDescription.substring(0, 500),
          }),
        });
        if (jobRes.ok) {
          const jobData = await jobRes.json();
          jobId = jobData.id; // use server-assigned id
        }
      } catch (e) {
        console.warn('Could not create job record:', e.message);
      }

      // Store jobId so downloadTailoredDocx and downloadCoverLetterDocx can reference it
      setCurrentJobId(jobId);

      // Fire impact amplifier in the background (don't block showing result)
      amplifyWithImpact(guidance, jobDescription);

      setStep('result');
    } catch (error) {
      console.error('Guidance error:', error);
      alert('Failed to generate guidance. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const amplifyWithImpact = async (guidance, jd) => {
    setAmplifyLoading(true);
    try {
      const response = await fetch('/api/anthropic/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          system: `You are an expert technical resume writer specializing in senior and staff-level automation and platform engineers. Your job is to rewrite resume tailoring guidance so every bullet point and recommendation leads with business and organizational impact — not tools, tasks, or technologies — while staying tightly aligned with the target job description.

TARGET JOB DESCRIPTION:
${jd}

Apply these rules to the input JSON object. Rewrite the following fields:
- summaryGuidance: rewrite to lead with the candidate's core differentiator as it relates to THIS specific role and job description. Emphasize the skills and experience that directly address what this employer is looking for.
- experiencesToHighlight: rewrite each item to lead with what was automated, eliminated, or connected — not what was built. Prioritize experiences that map directly to the job description's requirements and responsibilities.
- bulletPointExamples: rewrite each bullet to lead with impact, add quantified outcomes where implied by context. Every bullet should connect back to something the target job posting cares about.
- skillsToAdd: keep as-is
- keyPhrases: keep as-is
- suggestedTitle: if the title is generic (DevOps Engineer, IT Engineer, Software Engineer), upgrade it toward a title that closely matches the target job posting while reflecting the candidate's actual seniority

Rewriting rules:
1. LEAD WITH IMPACT — start with what was eliminated, reduced, automated, or connected
   - Bad: "Built Okta automation workflows for employee onboarding"
   - Good: "Eliminated 2+ hours of manual IT provisioning per hire by automating onboarding across Okta, SaaS systems, and access management"
2. QUANTIFY — surface any implied scale: employees supported, apps connected, hours saved, tickets eliminated. Use "organization-wide", "across all SaaS systems", "for 800+ employees" when exact numbers aren't available
3. STRONG VERBS — replace: built, worked on, used, helped, supported, maintained → automated, eliminated, reduced, connected, provisioned, deployed, standardized, architected
4. PLATFORM THINKING — frame as designing systems, not executing tasks
5. BRIDGE DOMAINS — when a bullet spans IT + cloud + software, make that explicit — it is the candidate's key differentiator
6. PRESERVE all tool names, technologies, and specifics — reframe around them, don't remove them
7. JOB ALIGNMENT — every rewritten bullet and recommendation must be relevant to the target job description. Drop or de-emphasize experience areas that don't map to what this employer is hiring for. Amplify the areas that do.

Return ONLY a valid JSON object with the exact same shape as the input. No commentary, no markdown fences, no explanation.`,
          messages: [{
            role: 'user',
            content: JSON.stringify(guidance),
          }],
        }),
      });

      const data = await response.json();
      const text = data.content.map(item => item.type === 'text' ? item.text : '').join('');
      const clean = text.replace(/```json|```/g, '').trim();
      const amplified = JSON.parse(clean);
      setAmplifiedGuidance(amplified);
    } catch (error) {
      console.error('Amplify error:', error);
    } finally {
      setAmplifyLoading(false);
    }
  };

  const copyBaseResume = () => {
    navigator.clipboard.writeText(profileData.resumeText);
    alert('✅ Base resume copied to clipboard!');
  };

  // ─── CHANGE 3: downloadTailoredDocx uses suggestedTitle + brand-name early career ──
  const downloadTailoredDocx = async () => {
    setLoading(true);
    try {
        const response = await fetch('/api/anthropic/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4000,
            messages: [{
            role: 'user',
            content: `Create a tailored resume in plain text format. Preserve the candidate's direct, factual voice throughout — no corporate filler.

BASE RESUME:
${profileData.resumeText}

ADDITIONAL QUALIFICATIONS:
${Object.keys(learnedSkills).length > 0 ? Object.entries(learnedSkills).map(([skill, exp]) => `${skill}: ${exp}`).join('\n') : 'None'}

TARGET JOB:
${jobDescription}

TAILORING GUIDANCE:
- Keywords: ${(showAmplified && amplifiedGuidance || tailoringGuidance)?.keyPhrases?.join(', ') || 'N/A'}
- Highlight: ${(showAmplified && amplifiedGuidance || tailoringGuidance)?.experiencesToHighlight?.join('; ') || 'N/A'}
- Add skills: ${(showAmplified && amplifiedGuidance || tailoringGuidance)?.skillsToAdd?.join(', ') || 'N/A'}

${VOICE_PROFILE}

INSTRUCTIONS:
1. Use the base resume structure
2. Incorporate keywords naturally — not forced, not repeated
3. Highlight specified experiences in bullet points
4. Add new skills where they fit organically
5. Rewrite the professional summary: specific and direct, no filler. What does this person actually do well?
6. Replace all placeholder sections marked with [BRACKETS]:
   Before filling any placeholder, classify the role into ONE primary category based on the job posting:

   NETWORK ENGINEER: job mentions routing protocols, BGP, OSPF, switching, firewalls, SD-WAN, ISP, WAN, LAN, network design, packet loss, latency, peering
   SECURITY ENGINEER: job mentions SOC, SIEM, EDR, incident response, threat hunting, vulnerability management, compliance
   CLOUD/INFRA ENGINEER: job mentions AWS, Azure, GCP, Terraform, IaC, Kubernetes, landing zones, cloud architecture
   IT/SYSTEMS ENGINEER: job mentions endpoints, MDM, Intune, Autopilot, Active Directory, helpdesk escalation, SaaS

   Then apply these rules based on classification:

   NETWORK ENGINEER role:
   - [PROFESSIONAL SUMMARY] must focus on routing, switching, firewalls, network design. No mention of MDM, endpoints, or SOC2 unless the JD asks for it.
   - [KEY IMPACT] header = KEY NETWORK ENGINEERING IMPACT
   - Bullets must come from: BGP architecture, firewall work, SD-WAN, ISP failover, network migrations. Zero automation or SOC2 bullets unless JD explicitly asks.

   SECURITY ENGINEER role:
   - [PROFESSIONAL SUMMARY] focuses on security tooling, compliance, incident response
   - [KEY IMPACT] header = KEY SECURITY IMPACT
   - Bullets from: CrowdStrike, SOC2, EDR, RTR scripts, vulnerability management

   CLOUD/INFRA ENGINEER role:
   - [PROFESSIONAL SUMMARY] focuses on cloud architecture, IaC, automation
   - [KEY IMPACT] header = KEY INFRASTRUCTURE IMPACT
   - Bullets from: Azure Landing Zone, Terraform, AWS, automation wins

   IT/SYSTEMS ENGINEER role:
   - [PROFESSIONAL SUMMARY] focuses on endpoint management, identity, SaaS administration
   - [KEY IMPACT] header = KEY SYSTEMS ENGINEERING IMPACT
   - Bullets from: Autopilot, Intune, Active Directory, Google Workspace

   Now fill the placeholders:
   [TITLE] → Single job title matching this specific role. No slashes, no compound titles.
   [PROFESSIONAL SUMMARY] → 3-4 sentences maximum. Direct and specific per the role classification above. No filler phrases per the voice profile.
   [KEY IMPACT] → Use the header from the role classification above. 4-5 bullets pulled from actual experience in the resume that directly map to what this job posting cares about. Every bullet must be relevant to the target role per the classification rules. Never include automation bullets for a pure networking role. Never include networking bullets for a pure security role.
   [CORE TECHNICAL SKILLS] → Reorder and filter the skills section based on what this role actually cares about. Rules:
   - Keep the same Label: value, value format
   - Lead with the most relevant category for this role
   - For networking roles: lead with Networking, move Cloud second
   - For security roles: lead with Security, move Practices second
   - For cloud/infra roles: lead with Cloud & IaC first
   - Drop or condense categories that are irrelevant to the role
   - Add any skills from learned qualifications that belong here
   - Never add skills the candidate doesn't actually have
7. Keep it ATS-friendly
8. Format section headers in Title Case (e.g. "Professional Experience", "Core Technical Skills", "Key Impact") — do NOT use ALL CAPS for headers
9. Format each job entry as: Job Title | Company Name | City, State (date range on next line)
10. Skills sections: "Label: value, value, value" format
11. Max 3 pages. 3-5 bullets per recent role.
12. EARLIER CAREER: brand-name companies get their own one-liner. Group only obscure employers.
13. Unexplained gaps of 6+ months: add a brief parenthetical on the nearest role.

Return the complete tailored resume as plain text with clear section headers.${useHybridFormat ? `

HYBRID FORMAT INSTRUCTION:
For each role in the experience section, write a 2-3 sentence narrative paragraph first that captures the overall scope, mission, and context of the role — what the candidate owned, what environment they operated in, and what the primary challenge or objective was. Follow the narrative with 3-4 tight bullet points that each lead with a specific, quantified impact. Do not write more than 4 bullets per role. The narrative should read like a senior engineer describing their work to a peer, not a job description. Keep it direct and specific.` : ''}`
            }]
            })
        });

        if (!response.ok) {
        throw new Error('Failed to generate resume');
        }

        const data = await response.json();
        const tailoredText = data.content.map(item => item.type === 'text' ? item.text : '').join('');
        setTailoredResumeText(tailoredText);

        // Save resume markdown to Blob and update job record
        if (currentJobId) {
          try {
            const docRes = await fetch(`/api/jobs/${currentJobId}/documents`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ resume: tailoredText }),
            });
            if (docRes.ok) {
              const { resumeKey } = await docRes.json();
              // Update job record with resumeKey
              await fetch('/api/jobs', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: currentJobId, resumeKey }),
              });
            }
          } catch (e) {
            console.warn('Could not save resume to Blob:', e.message);
          }
        }

        const lines = tailoredText.split('\n');
        const docParagraphs = [];

        const NAVY = '1B365D';
        const DARK = '222222';
        const BLUE = '2E6DB4';
        const GRAY = '666666';
        const font = 'Calibri';

        const isAllCaps = (s) => s.length > 3 && s === s.toUpperCase() && !/\d{2}\/\d{4}/.test(s) && !s.includes('@');
        const SECTION_HEADERS = ['professional experience', 'core technical skills', 'key impact', 'key network engineering impact', 'key security impact', 'key infrastructure impact', 'key systems engineering impact', 'education', 'certifications', 'earlier career', 'professional summary', 'skills', 'technical skills', 'projects', 'volunteer', 'awards'];
        const isSectionHeader = (s) => {
          if (isAllCaps(s)) return true;
          const lower = s.toLowerCase().trim();
          return SECTION_HEADERS.some(h => lower === h || lower.startsWith(h + ' '));
        };
        const isDateLine = (s) => /^\d{2}\/\d{4}/.test(s) || /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/.test(s);
        const isJobEntryLine = (s) => /\|/.test(s) && !s.includes('@') && !s.includes('http');
        const isSkillLine = (s) => /^[A-Za-z][A-Za-z &\/()-]+:\s/.test(s) && !isDateLine(s);

        let nameWritten = false;
        let titleWritten = false;
        let headerDone = false;
        const expectedTitle = (showAmplified && amplifiedGuidance || tailoringGuidance)?.suggestedTitle?.toLowerCase().trim() || '';

        lines.forEach((line, idx) => {
          const trimmed = line.trim();

          if (!trimmed) {
            if (headerDone) {
              docParagraphs.push(new Paragraph({ spacing: { after: 40 } }));
            } else if (nameWritten && titleWritten) {
              // Only end header section after title has been found
              headerDone = true;
            }
            // If name is written but title isn't yet, skip blank line without ending header
            return;
          }

          if (!nameWritten) {
            nameWritten = true;
            docParagraphs.push(new Paragraph({
              children: [new TextRun({ text: trimmed, bold: true, size: 52, color: DARK, font })],
              alignment: AlignmentType.LEFT,
              spacing: { after: 40 },
              border: { left: { color: NAVY, style: BorderStyle.SINGLE, size: 18, space: 8 } },
            }));
            return;
          }

          // --- Title formatting helper (used in multiple places) ---
          const formatAsTitle = (text) => {
            titleWritten = true;
            const titleText = isAllCaps(text)
              ? text.split(' ').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')
              : text;
            docParagraphs.push(new Paragraph({
              children: [new TextRun({ text: titleText, bold: true, size: 24, color: NAVY, font })],
              spacing: { before: 120, after: 100 },
            }));
          };

          // --- Section header formatting helper ---
          const formatAsSectionHeader = (text) => {
            const headerText = isAllCaps(text)
              ? text.split(' ').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')
              : text;
            docParagraphs.push(new Paragraph({
              children: [new TextRun({ text: headerText.toUpperCase(), bold: true, size: 20, color: NAVY, font })],
              border: { bottom: { color: NAVY, style: BorderStyle.SINGLE, size: 6, space: 4 } },
              spacing: { before: 300, after: 100 },
            }));
          };

          if (!headerDone) {
            // Escape hatch: if we hit a section header in the header area, end header immediately
            if (isSectionHeader(trimmed)) {
              headerDone = true;
              if (!titleWritten) titleWritten = true; // title was absent or missed
              formatAsSectionHeader(trimmed);
              return;
            }

            const matchesExpectedTitle = expectedTitle && trimmed.toLowerCase().trim() === expectedTitle;
            const looksLikeContact = trimmed.includes('@') || trimmed.includes('|') || trimmed.includes('•') || /\d{3}[\s.-]?\d{3}[\s.-]?\d{4}/.test(trimmed) || /https?:\/\//.test(trimmed) || /\.(com|net|org|io)\b/i.test(trimmed);
            const looksLikeLocation = /^[A-Z][a-zA-Z\s.]+,\s*[A-Z][a-zA-Z]+$/.test(trimmed) && trimmed.length < 50;
            if (!titleWritten && (matchesExpectedTitle || isAllCaps(trimmed) || (!looksLikeContact && !looksLikeLocation))) {
              formatAsTitle(trimmed);
              return;
            }
            const contactParts = trimmed.split(/\s*[|•]\s*/);
            if (contactParts.length > 1) {
              const children = [];
              contactParts.forEach((part, i) => {
                if (i > 0) children.push(new TextRun({ text: '  •  ', size: 18, color: GRAY, font }));
                children.push(new TextRun({ text: part.trim(), size: 18, color: GRAY, font }));
              });
              docParagraphs.push(new Paragraph({
                children,
                alignment: AlignmentType.LEFT,
                spacing: { after: 40 },
              }));
            } else {
              docParagraphs.push(new Paragraph({
                children: [new TextRun({ text: trimmed, size: 18, color: GRAY, font })],
                alignment: AlignmentType.LEFT,
                spacing: { after: 40 },
              }));
            }
            return;
          }

          // Safety catch: detect title after header section ended (e.g. blank line came first)
          if (!titleWritten && expectedTitle && trimmed.toLowerCase().trim() === expectedTitle) {
            formatAsTitle(trimmed);
            return;
          }

          if (isSectionHeader(trimmed)) {
            formatAsSectionHeader(trimmed);
            return;
          }

          if (isJobEntryLine(trimmed)) {
            const parts = trimmed.split('|').map(p => p.trim());
            const title = parts[0] || '';
            const companyLocation = parts.slice(1).join(', ');
            const children = [
              new TextRun({ text: title, bold: true, size: 20, font }),
            ];
            if (companyLocation) {
              children.push(new TextRun({ text: '  —  ', size: 20, color: GRAY, font }));
              children.push(new TextRun({ text: companyLocation, size: 20, color: GRAY, font }));
            }
            docParagraphs.push(new Paragraph({
              children,
              spacing: { before: 160, after: 20 },
            }));
            return;
          }

          if (isDateLine(trimmed)) {
            docParagraphs.push(new Paragraph({
              children: [new TextRun({ text: trimmed, size: 19, italics: true, color: GRAY, font })],
              spacing: { after: 60 },
            }));
            return;
          }

          if (/^[-•]\s/.test(line) || /^\s+[-•]\s/.test(line)) {
            const text = trimmed.replace(/^[-•]\s*/, '');
            docParagraphs.push(new Paragraph({
              children: [new TextRun({ text, size: 20, font })],
              bullet: { level: 0 },
              indent: { left: convertInchesToTwip(0.25), hanging: convertInchesToTwip(0.15) },
              spacing: { before: 30, after: 30 },
            }));
            return;
          }

          if (isSkillLine(trimmed)) {
            const colonIdx = trimmed.indexOf(':');
            const label = trimmed.substring(0, colonIdx + 1);
            const rest = trimmed.substring(colonIdx + 1);
            docParagraphs.push(new Paragraph({
              children: [
                new TextRun({ text: label, bold: true, size: 20, font }),
                new TextRun({ text: rest, size: 20, font }),
              ],
              spacing: { before: 30, after: 30 },
            }));
            return;
          }

          docParagraphs.push(new Paragraph({
            children: [new TextRun({ text: trimmed, size: 20, font })],
            spacing: { after: 80 },
          }));
        });

        const doc = new Document({
          styles: {
            default: {
              document: {
                run: { font, size: 20 },
              },
            },
          },
          sections: [{
            properties: {
              page: {
                margin: {
                  top: convertInchesToTwip(0.75),
                  right: convertInchesToTwip(0.75),
                  bottom: convertInchesToTwip(0.75),
                  left: convertInchesToTwip(0.85),
                },
              },
            },
            children: docParagraphs,
          }],
        });

        const blob = await Packer.toBlob(doc);
        const company = (tailoringGuidance?.companyName || 'Company').replace(/[^a-zA-Z0-9 ]/g, '').trim();
        saveAs(blob, `Resume - ${company}.docx`);

        // Update ATS score with tailored version + run hallucination check
        const ats = computeAtsScore(tailoredText);
        setAtsScore(ats);
        setAtsSource('tailored');
        runHallucinationCheck(tailoredText).then(report => {
          if (report) setHallucinationReport(report);
        });

        setResumeDownloaded(true);
        alert('✅ Resume downloaded as DOCX!');
    } catch (error) {
        console.error('DOCX generation error:', error);
        alert(`⚠️ Failed to generate DOCX: ${error.message}\n\nTrying text fallback...`);
        copyBaseResume();
    } finally {
        setLoading(false);
    }
    };

  const saveToJobTracker = async () => {
    if (!tailoredResumeText) {
      alert('⚠️ No tailored resume available. Please download the resume first.');
      return;
    }
    setLoading(true);
    try {
      const guidance = showAmplified && amplifiedGuidance ? amplifiedGuidance : tailoringGuidance;
      const company = guidance?.companyName || '';
      const jobTitle = guidance?.suggestedTitle || jobDescription.split('\n')[0].substring(0, 100);

      // If no current job exists yet, create one
      if (!currentJobId) {
        const jobRes = await fetch('/api/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company,
            jobTitle,
            status: 'Applied',
            appliedDate: new Date().toISOString().split('T')[0],
            keyPhrases: guidance?.keyPhrases || [],
            jobDescriptionSnippet: jobDescription.substring(0, 500),
            notes: `Resume saved as markdown on ${new Date().toLocaleDateString()}`,
          }),
        });
        if (jobRes.ok) {
          const jobData = await jobRes.json();
          setCurrentJobId(jobData.id);
          // Save resume markdown to the new job
          try {
            const docRes = await fetch(`/api/jobs/${jobData.id}/documents`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ resume: tailoredResumeText }),
            });
            if (docRes.ok) {
              const { resumeKey } = await docRes.json();
              await fetch('/api/jobs', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: jobData.id, resumeKey }),
              });
            }
          } catch (e) {
            console.warn('Could not save resume document:', e.message);
          }
        } else {
          const err = await jobRes.json();
          if (err.error === 'duplicate') {
            alert(`⚠️ This job is already in your tracker: ${jobTitle} at ${company}`);
            setSavedToTracker(true);
            return;
          }
          throw new Error(err.message || 'Failed to save job');
        }
      } else {
        // Update existing job record with resume markdown
        try {
          const docRes = await fetch(`/api/jobs/${currentJobId}/documents`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resume: tailoredResumeText }),
          });
          if (docRes.ok) {
            const { resumeKey } = await docRes.json();
            await fetch('/api/jobs', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: currentJobId, resumeKey, status: 'Applied' }),
            });
          }
        } catch (e) {
          console.warn('Could not save resume document:', e.message);
        }
      }

      // Refresh jobs list
      try {
        const res = await fetch('/api/jobs');
        if (res.ok) setExistingJobs(await res.json());
      } catch (e) { /* ignore */ }

      setSavedToTracker(true);
      alert('✅ Resume saved to Job Tracker!');
    } catch (error) {
      console.error('Save to tracker error:', error);
      alert(`⚠️ Failed to save to tracker: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const downloadCoverLetterDocx = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/anthropic/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          messages: [{
            role: 'user',
            content: `Write a cover letter. Do not make it sound like AI wrote it.

CANDIDATE RESUME:
${profileData.resumeText}

ADDITIONAL QUALIFICATIONS:
${Object.keys(learnedSkills).length > 0 ? Object.entries(learnedSkills).map(([skill, exp]) => `${skill}: ${exp}`).join('\n') : 'None'}

TARGET JOB DESCRIPTION:
${jobDescription}

TAILORING GUIDANCE:
- Keywords: ${tailoringGuidance?.keyPhrases?.join(', ') || 'N/A'}
- Highlight: ${tailoringGuidance?.experiencesToHighlight?.join('; ') || 'N/A'}

${VOICE_PROFILE}

STRUCTURE — 4 paragraphs, no more:
1. Opening: Name something specific about this company or role. Not generic praise, not "I am excited to apply." Say plainly why you're applying in 1-2 sentences.
2. Body paragraph 1: The single most relevant experience. What was the situation, what did you do, what happened. Be specific.
3. Body paragraph 2: Second strongest connection to the role. A metric is fine if it has context. Map a capability directly to their stated need.
4. Closing: 1-2 sentences. Direct. "I'd like to talk more about the role." No hedging.

Do NOT include: address block, date, greeting, sign-off.
Start with paragraph 1. End with paragraph 4.
Return plain text paragraphs only.`
          }]
        })
      });

      if (!response.ok) throw new Error('Failed to generate cover letter');

      const data = await response.json();
      const coverText = data.content.map(item => item.type === 'text' ? item.text : '').join('');

      // Save cover letter markdown to Blob and update job record
      if (currentJobId) {
        try {
          const docRes = await fetch(`/api/jobs/${currentJobId}/documents`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ coverLetter: coverText }),
          });
          if (docRes.ok) {
            const { coverLetterKey } = await docRes.json();
            await fetch('/api/jobs', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: currentJobId, coverLetterKey }),
            });
          }
        } catch (e) {
          console.warn('Could not save cover letter to Blob:', e.message);
        }
      }

      const font = 'Calibri';
      const NAVY = '1B365D';
      const DARK = '222222';
      const paragraphs = coverText.split('\n').filter(l => l.trim());

      const docParagraphs = [];

      const nameMatch = profileData.resumeText.match(/^(.+?)[\n\r]/);
      const candidateName = nameMatch ? nameMatch[1].trim() : 'Cover Letter';

      docParagraphs.push(new Paragraph({
        children: [new TextRun({ text: candidateName, bold: true, size: 52, color: DARK, font })],
        alignment: AlignmentType.LEFT,
        spacing: { after: 40 },
        border: { left: { color: NAVY, style: BorderStyle.SINGLE, size: 18, space: 8 } },
      }));

      docParagraphs.push(new Paragraph({
        children: [new TextRun({ text: 'Cover Letter', size: 22, color: '2E6DB4', font })],
        alignment: AlignmentType.LEFT,
        spacing: { after: 200 },
      }));

      const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      docParagraphs.push(new Paragraph({
        children: [new TextRun({ text: today, size: 20, color: '666666', font })],
        spacing: { after: 200 },
      }));

      paragraphs.forEach((para) => {
        docParagraphs.push(new Paragraph({
          children: [new TextRun({ text: para.trim(), size: 21, font })],
          spacing: { after: 160 },
        }));
      });

      const doc = new Document({
        styles: { default: { document: { run: { font, size: 20 } } } },
        sections: [{
          properties: {
            page: {
              margin: {
                top: convertInchesToTwip(0.75),
                right: convertInchesToTwip(0.75),
                bottom: convertInchesToTwip(0.75),
                left: convertInchesToTwip(0.85),
              },
            },
          },
          children: docParagraphs,
        }],
      });

      const blob = await Packer.toBlob(doc);
      const company = (tailoringGuidance?.companyName || 'Company').replace(/[^a-zA-Z0-9 ]/g, '').trim();
      saveAs(blob, `CoverLetter - ${company}.docx`);
      alert('✅ Cover letter downloaded as DOCX!');
    } catch (error) {
      console.error('Cover letter generation error:', error);
      alert(`⚠️ Failed to generate cover letter: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ─── Hallucination guard ────────────────────────────────────────────────
  const runHallucinationCheck = async (tailoredText) => {
    try {
      const response = await fetch('/api/anthropic/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          messages: [{
            role: 'user',
            content: `You are a resume fact-checker. Compare the TAILORED RESUME against the SOURCE MATERIALS below. Flag ANY claim in the tailored resume that cannot be verified from the source materials.

SOURCE MATERIALS:
--- Base Resume ---
${profileData.resumeText}

--- Interview Answers ---
${Object.entries(learnedSkills).map(([s, e]) => `${s}: ${e}`).join('\n') || 'None'}

TAILORED RESUME:
${tailoredText}

Return JSON only:
{
  "score": <0-100, where 100 means fully verified>,
  "flags": [
    {"claim": "the suspect text", "severity": "high|medium|low", "reason": "why this may be fabricated"}
  ]
}

Rules:
- "high" = fabricated metric, title, company, or certification not in source
- "medium" = exaggerated scope or impact beyond what source supports
- "low" = minor rewording that slightly stretches the original meaning
- Rephrasing the same experience in different words is NOT a flag
- Adding industry-standard keywords to describe existing experience is NOT a flag
- Only flag claims where specific facts (numbers, names, titles, companies) appear that have no basis in the source`
          }]
        })
      });
      const data = await response.json();
      const text = data.content.map(item => item.type === 'text' ? item.text : '').join('');
      const clean = text.replace(/```json|```/g, '').trim();
      return JSON.parse(clean);
    } catch (error) {
      console.error('Hallucination check failed:', error);
      return null;
    }
  };

  // ─── ATS keyword scoring ──────────────────────────────────────────────
  const computeAtsScore = (tailoredText) => {
    if (!tailoringGuidance?.keyPhrases || !tailoredText) return null;

    const resumeLower = tailoredText.toLowerCase();
    const jdLower = jobDescription.toLowerCase();

    // Check key phrases from guidance
    const phraseResults = tailoringGuidance.keyPhrases.map(phrase => ({
      phrase,
      found: resumeLower.includes(phrase.toLowerCase()),
    }));

    // Extract additional keywords from JD (2+ word phrases that appear 2+ times)
    const jdWords = jdLower.match(/\b[a-z]{3,}\b/g) || [];
    const wordFreq = {};
    jdWords.forEach(w => { wordFreq[w] = (wordFreq[w] || 0) + 1; });
    const commonStopwords = new Set(['the','and','for','that','this','with','from','are','was','were','will','have','has','had','been','being','would','could','should','their','they','them','these','those','which','about','into','your','you','our','can','may','also','more','other','than','each','all','any','how','who','what','when','where','but','not','very','just','over','such','some','only','its','does','did','most']);
    const importantJdWords = Object.entries(wordFreq)
      .filter(([w, c]) => c >= 2 && !commonStopwords.has(w))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([w]) => w);

    const jdWordResults = importantJdWords.map(word => ({
      word,
      found: resumeLower.includes(word),
    }));

    const phraseMatch = phraseResults.filter(p => p.found).length;
    const wordMatch = jdWordResults.filter(w => w.found).length;
    const totalChecks = phraseResults.length + jdWordResults.length;
    const matchedChecks = phraseMatch + wordMatch;
    const percentage = totalChecks > 0 ? Math.round((matchedChecks / totalChecks) * 100) : 0;

    return {
      percentage,
      phraseResults,
      jdWordResults,
      phraseMatch,
      wordMatch,
    };
  };

  const resetForNewJob = () => {
    setJobDescription('');
    setQuestions([]);
    setAnswers({});
    setTailoringGuidance(null);
    setHallucinationReport(null);
    setAtsScore(null);
    setAtsSource(null);
    setCurrentJobId(null);
    setExistingJobs([]);
    setAmplifiedGuidance(null);
    setAmplifyLoading(false);
    setShowAmplified(false);
    setUseHybridFormat(false);
    setTailoredResumeText(null);
    setResumeDownloaded(false);
    setSavedToTracker(false);
    setStep('input');
  };

  const exportData = async () => {
    try {
      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        profile: profileData,
        savedApplications: savedApplications,
        learnedSkills: learnedSkills
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resume-data-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      alert('✅ Data exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      alert('❌ Failed to export data');
    }
  };

  const importData = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (!data.version || !data.profile) {
        alert('❌ Invalid data file format');
        return;
      }
      
      if (data.profile) {
        setProfileData(data.profile);
      }
      
      if (data.savedApplications) {
        setSavedApplications(data.savedApplications);
      }
      
      if (data.learnedSkills) {
        setLearnedSkills(data.learnedSkills);
      }

      await saveStorage({
        profile: data.profile || profileData,
        savedApplications: data.savedApplications || [],
        learnedSkills: data.learnedSkills || {},
        skillsSeeded: true,
      });
      
      alert('✅ Data imported successfully!');
      setStep('input');
    } catch (error) {
      console.error('Import error:', error);
      alert('❌ Failed to import data. Please check the file format.');
    }
    
    event.target.value = '';
  };

  const clearAllData = async () => {
    if (!confirm('Are you sure you want to clear all stored data? This cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch('/api/storage', { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to clear data');
      }
      
      setProfileData(null);
      setSavedApplications([]);
      setLearnedSkills({});
      setSkillsSeeded(false);
      initializeApp();
    } catch (error) {
      console.error('Failed to clear data:', error);
      alert('Failed to clear data');
    }
  };

  const startEditingProfile = () => {
    setEditedProfile({
      resumeText: profileData.resumeText,
      linkedInUrl: profileData.linkedInUrl
    });
    setIsEditingProfile(true);
  };

  const cancelEditingProfile = () => {
    setIsEditingProfile(false);
    setEditedProfile({ resumeText: '', linkedInUrl: '' });
  };

  const saveProfile = async () => {
    if (!editedProfile.resumeText.trim()) {
      alert('Resume text cannot be empty');
      return;
    }

    try {
      setProfileData(editedProfile);
      await saveStorage({
        profile: editedProfile,
        savedApplications,
        learnedSkills,
        skillsSeeded,
      });
      setIsEditingProfile(false);
      alert('✅ Profile updated successfully!');
    } catch (error) {
      console.error('Failed to save profile:', error);
      alert('❌ Failed to save profile');
    }
  };

  // ─── Gap type config (single source of truth) ──────────────────────────
  const GAP_TYPES = {
    platform: { badge: 'bg-purple-100 text-purple-700', label: 'Platform' },
    timeline: { badge: 'bg-yellow-100 text-yellow-700', label: 'Timeline' },
    skill:    { badge: 'bg-blue-100 text-blue-700',     label: 'Skill' },
  };
  const getGapType = (type) => GAP_TYPES[type] || GAP_TYPES.skill;

  // ─── Resume file import handler ──────────────────────────────────────────
  const [resumeImportLoading, setResumeImportLoading] = useState(false);
  const [setupResumeText, setSetupResumeText] = useState('');
  const [setupLinkedInUrl, setSetupLinkedInUrl] = useState('');

  const handleResumeFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setResumeImportLoading(true);
    try {
      const ext = file.name.split('.').pop().toLowerCase();

      if (ext === 'docx') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        setSetupResumeText(result.value);
      } else if (ext === 'pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let text = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map(item => item.str).join(' ') + '\n';
        }
        setSetupResumeText(text.trim());
      } else if (ext === 'md' || ext === 'txt') {
        const text = await file.text();
        setSetupResumeText(text);
      } else {
        alert('Unsupported file format. Please use PDF, DOCX, Markdown (.md), or text (.txt).');
      }
    } catch (error) {
      console.error('Failed to parse resume file:', error);
      alert('Failed to parse file. Try pasting your resume text instead.');
    } finally {
      setResumeImportLoading(false);
    }
  };

  const saveSetupProfile = async () => {
    if (!setupResumeText.trim()) {
      alert('Please import or paste your resume before continuing.');
      return;
    }

    const newProfile = { resumeText: setupResumeText.trim(), linkedInUrl: setupLinkedInUrl.trim() };
    setProfileData(newProfile);
    setStep('input');

    try {
      await saveStorage({
        profile: newProfile,
        savedApplications,
        learnedSkills,
        skillsSeeded,
      });
    } catch (error) {
      console.error('Failed to save profile:', error);
    }
  };

  if (step === 'loading') {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (step === 'setup') {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Resume Customizer</h1>
          <p className="text-gray-600">Import your resume to get started. We'll use it to tailor applications to specific job descriptions.</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-4">Import Your Resume</h2>

          <div className="flex gap-3 mb-4">
            <label className="flex-1 bg-white border-2 border-dashed border-blue-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition">
              <FileUp size={32} className="mx-auto mb-2 text-blue-600" />
              <p className="font-medium text-blue-800">Upload File</p>
              <p className="text-sm text-blue-600 mt-1">PDF, DOCX, Markdown, or Text</p>
              <input
                type="file"
                accept=".pdf,.docx,.md,.txt"
                onChange={handleResumeFileUpload}
                className="hidden"
                disabled={resumeImportLoading}
              />
            </label>
          </div>

          {resumeImportLoading && (
            <div className="flex items-center gap-2 text-blue-700 mb-4">
              <Loader2 size={16} className="animate-spin" />
              <span>Parsing file...</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resume Text {setupResumeText ? '(imported — edit below if needed)' : '(or paste directly)'}
              </label>
              <textarea
                value={setupResumeText}
                onChange={(e) => setSetupResumeText(e.target.value)}
                rows={16}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                placeholder="Paste your complete resume here, or use the upload button above..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                LinkedIn URL (optional)
              </label>
              <input
                type="text"
                value={setupLinkedInUrl}
                onChange={(e) => setSetupLinkedInUrl(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="linkedin.com/in/yourprofile"
              />
            </div>

            <button
              onClick={saveSetupProfile}
              disabled={!setupResumeText.trim()}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <Check size={20} />
              Save Profile & Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'input') {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white">
        <div className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Resume Customizer</h1>
            <p className="text-gray-600">Get AI-powered guidance to tailor your resume</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportData}
              className="text-blue-600 hover:text-blue-700 flex items-center gap-2 text-sm px-3 py-1 border border-blue-300 rounded hover:bg-blue-50"
              title="Export all data"
            >
              <FolderDown size={16} />
              Export
            </button>
            <label className="text-green-600 hover:text-green-700 flex items-center gap-2 text-sm px-3 py-1 border border-green-300 rounded hover:bg-green-50 cursor-pointer" title="Import data">
              <Upload size={16} />
              Import
              <input
                type="file"
                accept=".json"
                onChange={importData}
                className="hidden"
              />
            </label>
            <button
              onClick={clearAllData}
              className="text-red-600 hover:text-red-700 flex items-center gap-2 text-sm px-3 py-1 border border-red-300 rounded hover:bg-red-50"
              title="Clear all data"
            >
              <Trash2 size={16} />
              Reset
            </button>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <p className="text-green-800 font-medium">
                ✅ Profile loaded: {profileData.resumeText?.split('\n')[0] || 'Your Resume'}
              </p>
              <p className="text-green-700 text-sm mt-1">
                LinkedIn: {profileData.linkedInUrl}
              </p>
            </div>
            <button
              onClick={startEditingProfile}
              className="text-green-700 hover:text-green-800 flex items-center gap-1 text-sm"
              title="Edit profile"
            >
              <Edit2 size={16} />
              Edit
            </button>
          </div>
        </div>

        {isEditingProfile && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Edit Profile</h2>
                <button
                  onClick={cancelEditingProfile}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    LinkedIn URL
                  </label>
                  <input
                    type="text"
                    value={editedProfile.linkedInUrl}
                    onChange={(e) => setEditedProfile({...editedProfile, linkedInUrl: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="linkedin.com/in/yourprofile"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Base Resume
                    </label>
                    <label className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm cursor-pointer">
                      <FileUp size={14} />
                      Import from file
                      <input
                        type="file"
                        accept=".pdf,.docx,.md,.txt"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const ext = file.name.split('.').pop().toLowerCase();
                            if (ext === 'docx') {
                              const arrayBuffer = await file.arrayBuffer();
                              const result = await mammoth.extractRawText({ arrayBuffer });
                              setEditedProfile({...editedProfile, resumeText: result.value});
                            } else if (ext === 'pdf') {
                              const arrayBuffer = await file.arrayBuffer();
                              pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
                              const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                              let text = '';
                              for (let i = 1; i <= pdf.numPages; i++) {
                                const page = await pdf.getPage(i);
                                const content = await page.getTextContent();
                                text += content.items.map(item => item.str).join(' ') + '\n';
                              }
                              setEditedProfile({...editedProfile, resumeText: text.trim()});
                            } else if (ext === 'md' || ext === 'txt') {
                              const text = await file.text();
                              setEditedProfile({...editedProfile, resumeText: text});
                            } else {
                              alert('Unsupported format. Use PDF, DOCX, Markdown, or Text.');
                            }
                          } catch (err) {
                            console.error('Failed to parse file:', err);
                            alert('Failed to parse file.');
                          }
                          e.target.value = '';
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <textarea
                    value={editedProfile.resumeText}
                    onChange={(e) => setEditedProfile({...editedProfile, resumeText: e.target.value})}
                    rows={20}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    placeholder="Paste your complete resume here..."
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={saveProfile}
                    className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
                  >
                    <Check size={20} />
                    Save Profile
                  </button>
                  <button
                    onClick={cancelEditingProfile}
                    className="flex-1 bg-gray-200 text-gray-800 py-3 px-6 rounded-lg hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {savedApplications.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-800 font-medium">
              📚 {savedApplications.length} previous {savedApplications.length === 1 ? 'application' : 'applications'} saved. Your profile is getting smarter!
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Job Description
            </label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={16}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              placeholder="Paste the complete job description here..."
            />
          </div>

          <button
            onClick={analyzeJobDescription}
            disabled={loading || !jobDescription.trim()}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <Briefcase size={20} />
            {loading ? 'Analyzing...' : 'Analyze Job Description'}
          </button>
        </div>

        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2">💡 How it works</h3>
          <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
            <li>Paste the job description above</li>
            <li>I'll identify skill gaps, missing platforms, and any timeline gaps</li>
            <li>Answer a few quick questions about missing qualifications</li>
            <li>Get AI-powered guidance on how to tailor your resume</li>
            <li>Every answer gets saved and used for future applications!</li>
          </ol>
        </div>
      </div>
    );
  }

  // ─── CHANGE 4: Questions UI shows gap type badges ─────────────────────────
  if (step === 'questions') {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Fill in the Gaps</h1>
          <p className="text-gray-600">
            {questions.length === 0 
              ? "Great! Your profile covers everything needed for this role."
              : `I found ${questions.length} area${questions.length > 1 ? 's' : ''} where additional info would strengthen your resume.`
            }
          </p>
        </div>

        {questions.length === 0 ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <p className="text-green-800 mb-4">
              Your existing resume and learned experiences already cover all the key requirements for this role!
            </p>
            <button
              onClick={generateGuidance}
              disabled={loading}
              className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
            >
              <Lightbulb size={20} />
              {loading ? 'Generating...' : 'Get Tailoring Guidance'}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {questions.map((q, idx) => (
              <div key={idx} className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                <div className="mb-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{q.skill}</h3>
                      {/* ── Gap type badge ── */}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getGapType(q.type).badge}`}>
                        {getGapType(q.type).label}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                      {idx + 1} of {questions.length}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{q.why}</p>
                  <p className="text-gray-800 font-medium">{q.question}</p>
                </div>
                <textarea
                  value={answers[q.question] || ''}
                  onChange={(e) => setAnswers({...answers, [q.question]: e.target.value})}
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe your experience... (optional - skip if not applicable)"
                />
              </div>
            ))}

            <button
              onClick={generateGuidance}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:bg-gray-400"
            >
              <Lightbulb size={20} />
              {loading ? 'Generating Guidance...' : 'Get Tailoring Guidance'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ─── CHANGE 5: Result page shows suggestedTitle prominently ──────────────
  if (step === 'result') {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Resume Tailoring Guidance</h1>
          <p className="text-gray-600">Use these insights to customize your resume for this role</p>
        </div>

        {/* Guidance mode toggle */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setShowAmplified(false)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${!showAmplified ? 'bg-indigo-600 text-white' : 'border border-indigo-300 text-indigo-600 hover:bg-indigo-50'}`}
          >
            Original
          </button>
          <button
            onClick={() => setShowAmplified(true)}
            disabled={amplifyLoading && !amplifiedGuidance}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${showAmplified ? 'bg-indigo-600 text-white' : 'border border-indigo-300 text-indigo-600 hover:bg-indigo-50'}`}
          >
            {amplifyLoading && !amplifiedGuidance ? (
              <><Loader2 size={14} className="animate-spin" /> Amplifying...</>
            ) : (
              <><Zap size={14} /> Impact Amplified</>
            )}
          </button>

          {/* Resume format toggle */}
          <div className="ml-4 border-l border-gray-200 pl-4 flex gap-2">
            <button
              onClick={() => setUseHybridFormat(false)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${!useHybridFormat ? 'bg-indigo-600 text-white' : 'border border-indigo-300 text-indigo-600 hover:bg-indigo-50'}`}
            >
              Bullet Points
            </button>
            <button
              onClick={() => setUseHybridFormat(true)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${useHybridFormat ? 'bg-indigo-600 text-white' : 'border border-indigo-300 text-indigo-600 hover:bg-indigo-50'}`}
            >
              Hybrid Format
            </button>
          </div>
        </div>

        {/* Suggested title callout */}
        {(showAmplified && amplifiedGuidance || tailoringGuidance)?.suggestedTitle && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-1">Suggested Professional Headline</p>
              <p className="text-indigo-900 font-semibold text-lg">{(showAmplified && amplifiedGuidance || tailoringGuidance).suggestedTitle}</p>
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText((showAmplified && amplifiedGuidance || tailoringGuidance).suggestedTitle).then(() => alert('✅ Headline copied!')).catch(() => alert('❌ Copy failed')); }}
              className="shrink-0 text-indigo-600 hover:text-indigo-800 flex items-center gap-1 text-sm border border-indigo-300 rounded px-3 py-1.5 hover:bg-indigo-100"
            >
              <Copy size={14} />
              Copy
            </button>
          </div>
        )}

        <div className="mb-6 flex flex-wrap gap-3">
            <button
            onClick={downloadTailoredDocx}
            disabled={loading}
            className="flex-1 bg-purple-600 text-white py-3 px-6 rounded-lg hover:bg-purple-700 transition flex items-center justify-center gap-2 disabled:bg-gray-400"
            >
            <Download size={20} />
            {loading ? 'Generating...' : 'Resume (DOCX)'}
            </button>
            <button
            onClick={downloadCoverLetterDocx}
            disabled={loading}
            className="flex-1 bg-indigo-600 text-white py-3 px-6 rounded-lg hover:bg-indigo-700 transition flex items-center justify-center gap-2 disabled:bg-gray-400"
            >
            <FileText size={20} />
            {loading ? 'Generating...' : 'Cover Letter (DOCX)'}
            </button>
          <button
            onClick={copyBaseResume}
            className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
          >
            <Copy size={20} />
            Copy Base Resume
          </button>
          <button
            onClick={resetForNewJob}
            className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            New Application
          </button>
        </div>

        {resumeDownloaded && (
          <div className="mb-6">
            <button
              onClick={saveToJobTracker}
              disabled={loading || savedToTracker}
              className={`w-full py-3 px-6 rounded-lg transition flex items-center justify-center gap-2 text-white ${
                savedToTracker
                  ? 'bg-green-500 cursor-default'
                  : 'bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400'
              }`}
            >
              {savedToTracker ? (
                <>
                  <Check size={20} />
                  Saved to Job Tracker
                </>
              ) : loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Briefcase size={20} />
                  Save Resume &amp; Track Application
                </>
              )}
            </button>
          </div>
        )}

        {(() => {
          const activeGuidance = showAmplified && amplifiedGuidance ? amplifiedGuidance : tailoringGuidance;
          return activeGuidance && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
              <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <Lightbulb size={20} />
                Key Keywords to Include
              </h3>
              <div className="flex flex-wrap gap-2">
                {activeGuidance.keyPhrases?.map((phrase, idx) => (
                  <span key={idx} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                    {phrase}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-5">
              <h3 className="font-semibold text-purple-900 mb-3">Professional Summary Guidance</h3>
              <p className="text-purple-800">{activeGuidance.summaryGuidance}</p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-5">
              <h3 className="font-semibold text-green-900 mb-3">Experiences to Highlight</h3>
              <ul className="space-y-2">
                {activeGuidance.experiencesToHighlight?.map((exp, idx) => (
                  <li key={idx} className="text-green-800 flex items-start gap-2">
                    <span className="text-green-600 mt-1">✓</span>
                    <span>{exp}</span>
                  </li>
                ))}
              </ul>
            </div>

            {activeGuidance.skillsToAdd && activeGuidance.skillsToAdd.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-5">
                <h3 className="font-semibold text-orange-900 mb-3">Skills to Add from Your Qualifications</h3>
                <ul className="space-y-2">
                  {activeGuidance.skillsToAdd.map((skill, idx) => (
                    <li key={idx} className="text-orange-800 flex items-start gap-2">
                      <span className="text-orange-600 mt-1">+</span>
                      <span>{skill}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {activeGuidance.bulletPointExamples && activeGuidance.bulletPointExamples.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
                <h3 className="font-semibold text-gray-900 mb-3">Example Bullet Points</h3>
                <ul className="space-y-2">
                  {activeGuidance.bulletPointExamples.map((bullet, idx) => (
                    <li key={idx} className="text-gray-800 flex items-start gap-2">
                      <span className="text-gray-600 mt-1">•</span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          );
        })()}

        {/* ─── ATS Score Panel ──────────────────────────────────────────── */}
        {atsScore && (
          <div className="mt-6 bg-white border border-gray-200 rounded-lg p-5">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <BarChart3 size={20} />
              ATS Keyword Match Score
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${atsSource === 'tailored' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                {atsSource === 'tailored' ? 'Tailored Resume' : 'Base Resume'}
              </span>
            </h3>
            <div className="flex items-center gap-4 mb-4">
              <div className={`text-4xl font-bold ${atsScore.percentage >= 80 ? 'text-green-600' : atsScore.percentage >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                {atsScore.percentage}%
              </div>
              <div className="flex-1">
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${atsScore.percentage >= 80 ? 'bg-green-500' : atsScore.percentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${atsScore.percentage}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Key phrases: {atsScore.phraseMatch}/{atsScore.phraseResults.length} matched | JD keywords: {atsScore.wordMatch}/{atsScore.jdWordResults.length} matched
                </p>
              </div>
            </div>
            {atsScore.phraseResults.some(p => !p.found) && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Missing key phrases:</p>
                <div className="flex flex-wrap gap-2">
                  {atsScore.phraseResults.filter(p => !p.found).map((p, idx) => (
                    <span key={idx} className="bg-red-50 text-red-700 px-2 py-1 rounded text-xs border border-red-200">
                      {p.phrase}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Hallucination Guard Panel ─────────────────────────────────── */}
        {hallucinationReport && (
          <div className={`mt-4 border rounded-lg p-5 ${hallucinationReport.score >= 90 ? 'bg-green-50 border-green-200' : hallucinationReport.score >= 70 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'}`}>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <ShieldCheck size={20} />
              Fact-Check Report
              <span className={`text-sm font-normal px-2 py-0.5 rounded-full ${hallucinationReport.score >= 90 ? 'bg-green-100 text-green-700' : hallucinationReport.score >= 70 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                {hallucinationReport.score}% verified
              </span>
            </h3>
            {hallucinationReport.flags?.length === 0 ? (
              <p className="text-green-700 text-sm">All claims verified against your source materials.</p>
            ) : (
              <div className="space-y-2">
                {hallucinationReport.flags?.map((flag, idx) => (
                  <div key={idx} className={`text-sm p-3 rounded border ${flag.severity === 'high' ? 'bg-red-50 border-red-300' : flag.severity === 'medium' ? 'bg-yellow-50 border-yellow-300' : 'bg-gray-50 border-gray-300'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold uppercase px-1.5 py-0.5 rounded ${flag.severity === 'high' ? 'bg-red-200 text-red-800' : flag.severity === 'medium' ? 'bg-yellow-200 text-yellow-800' : 'bg-gray-200 text-gray-700'}`}>
                        {flag.severity}
                      </span>
                    </div>
                    <p className="text-gray-800 font-medium">&ldquo;{flag.claim}&rdquo;</p>
                    <p className="text-gray-600 mt-1">{flag.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Version History Panel ─────────────────────────────────────── */}
        {savedApplications.length > 1 && (
          <div className="mt-4 border border-gray-200 rounded-lg p-5 bg-white">
            <button
              onClick={() => setShowVersionHistory(!showVersionHistory)}
              className="w-full flex items-center justify-between text-left"
            >
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <History size={20} />
                Version History ({savedApplications.length} applications)
              </h3>
              <span className="text-gray-400 text-sm">{showVersionHistory ? 'Hide' : 'Show'}</span>
            </button>
            {showVersionHistory && (
              <div className="mt-4 space-y-3">
                {[...savedApplications].reverse().map((app, idx) => (
                  <div key={app.id} className={`p-3 rounded-lg border text-sm ${idx === 0 ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900">
                        {app.jobTitle || 'Untitled'}{app.company ? ` — ${app.company}` : ''}
                        {idx === 0 && <span className="ml-2 text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">Current</span>}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(app.date).toLocaleDateString()}
                      </span>
                    </div>
                    {app.guidance?.suggestedTitle && (
                      <p className="text-gray-600 text-xs">Headline: {app.guidance.suggestedTitle}</p>
                    )}
                    {app.guidance?.keyPhrases && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {app.guidance.keyPhrases.slice(0, 6).map((kw, i) => (
                          <span key={i} className="text-xs bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded">{kw}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-900 mb-2">📝 Next Steps</h3>
          <ol className="text-sm text-yellow-800 space-y-1 list-decimal list-inside">
            <li>Download your tailored resume as DOCX above</li>
            <li>Review the ATS score and fact-check report below</li>
            <li>Fix any flagged issues, then re-download if needed</li>
            <li>Generate a matching cover letter when ready</li>
          </ol>
        </div>
      </div>
    );
  }

  return null;
};

export default ResumeCustomizer;
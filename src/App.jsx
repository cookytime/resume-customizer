import React, { useState, useEffect } from 'react';
import interviewData from '../interview_questions.json';
import { FileText, Briefcase, Download, Save, Trash2, Plus, Upload, FolderDown, Edit2, X, Check, Copy, Lightbulb } from 'lucide-react';
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
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedProfile, setEditedProfile] = useState({ resumeText: '', linkedInUrl: '' });
  
  const GLEN_RESUME = `Glen Cook
Oakland, CA
glen@glencook.net | 510-508-9402 | glencook.net | LinkedIn linkedin.com/in/glencook

STAFF IT INFRASTRUCTURE & NETWORK ENGINEER

Staff-level Infrastructure and Network Engineer with 20+ years of experience designing, securing, and scaling enterprise environments across cloud and on-prem platforms. Deep expertise in Azure and AWS architecture, network design (BGP/OSPF/SD-WAN), security tooling (CrowdStrike, Palo Alto), and Infrastructure as Code (Terraform). Known for owning complex systems end-to-end, driving automation, improving reliability, and mentoring engineers through example and technical leadership.

CORE TECHNICAL SKILLS
Cloud & IaC: Azure, AWS, Azure Landing Zones, Terraform, Intune, Autopilot
Networking: BGP, OSPF, Palo Alto, Prisma SD-WAN, Cisco DNA, Juniper, Alkira
Security: CrowdStrike Falcon, SOC2, Okta, EDR, Vulnerability Management
Systems: Windows Server, Active Directory, macOS, Linux
Observability: SolarWinds, Zabbix, LibreNMS
Practices: Architecture Design, Automation, Incident Response, Mentorship

KEY TECHNICAL IMPACT
- Consolidated Active Directory from 17 → 5 domain controllers, reducing replication errors by 60% and improving reliability
- Led Azure Landing Zone migrations for 150+ workloads, improving governance, security, and scalability
- Designed multi-ISP BGP architectures with dynamic failover, significantly increasing uptime
- Automated SOC2 evidence collection and security reporting, reducing audit effort by 40%
- Standardized Terraform-based network and cloud deployments across 100+ devices

PROFESSIONAL EXPERIENCE

Staff / Senior Infrastructure Engineer
Alameda Unified School District — Alameda, CA
02/2025 – Present
- Architect and own district-wide network and systems infrastructure supporting 17 school sites
- Designed and implemented BGP-based multi-ISP failover architecture, increasing network resilience and uptime
- Migrated Aruba AOS 8 controllers to cloud-managed AOS 10, improving visibility and scalability
- Implemented Microsoft Autopilot and Intune for Windows and macOS, streamlining endpoint lifecycle management
- Optimized CrowdStrike Falcon reporting and vulnerability compliance automation
- Designed and validated high-availability Palo Alto firewall failover and simplified firewall policy architecture

Information Technology Engineer
EverOps — Remote
02/2024 – 12/2024
- Optimized CrowdStrike Falcon for external clients by developing 10+ RTR scripts and 5+ dashboards
- Built automated SOC2 evidence-gathering workflows, reducing manual audit effort by 40%
- Integrated automated ticketing workflows, reducing manual security operations by 30%
- Served as escalation point for complex security, AD, and cloud infrastructure issues
- Led hands-on CrowdStrike training sessions, improving incident response efficiency by 25%

Senior IT Infrastructure Engineer
Adaptive Biotechnologies Corp. — South San Francisco, CA
11/2022 – 02/2024
- Led Azure Landing Zone migration, transitioning 150+ workloads from legacy subscriptions
- Designed Alkira cloud network architecture and migrated firewall rules from Cisco to Palo Alto PanOS
- Implemented Terraform-based IaC for network deployments, reducing configuration drift across 100+ devices
- Standardized BGP and OSPF routing, eliminating manual routes and improving stability
- Deployed SolarWinds, reducing troubleshooting time by 70%
- Administered Cisco DNA infrastructure (200+ switches, 50+ APs), reducing downtime by 80%

Network Engineer
Faire — San Francisco Bay Area
05/2022 – 10/2022
- Led migration of 15+ sites from Meraki to Juniper/Palo Alto, improving throughput by 40%
- Deployed Prisma SD-WAN across 10+ branches, reducing downtime by 30%
- Built NetBox-based DCIM and asset management system, reducing deployment errors by 85%
- Developed Terraform repositories for AWS infrastructure with S3 backend
- Resolved 90% of critical network incidents within SLA

Staff IT Engineer
Ripple — San Francisco Bay Area
10/2019 – 06/2021
- Designed and owned AWS and on-prem infrastructure using IaC methodologies
- Architected multi-office and cloud networking supporting a remote workforce
- Implemented Okta, MDM (macOS & Windows), and EDR to improve security posture
- Led vendor architecture reviews, QBRs, and SLA enforcement
- Designed and deployed enterprise AV solutions using Zoom and Google Meet

IT Systems Engineer
Lyft — San Francisco Bay Area
01/2019 – 10/2019
- Served as senior escalation point for endpoint and systems engineering teams
- Designed monitoring solutions using Zabbix, LibreNMS, and Foreman
- Automated Unix and Windows server configuration using Puppet
- Managed AWS migrations and cloud infrastructure operations
- Maintained 24/7 on-call rotation for critical infrastructure

EARLY CAREER (CONDENSED)
Network & Voice Engineering Roles — Twitter, Salesforce, Fleet One, GHD, Swinburne University
2003 – 2019
- Designed and supported global enterprise network and VoIP infrastructures
- Led CUCM, SIP, and unified communications deployments at scale
- Served as senior escalation engineer and technical mentor`;

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
        const profile = localStorage.getItem('resume_profile');
        const apps = localStorage.getItem('saved_applications');

        // Seed interview Q&A into learned_skills once
        if (!localStorage.getItem('skills_seeded')) {
          const existing = localStorage.getItem('learned_skills');
          const learnedSkills = existing ? JSON.parse(existing) : {};
          interviewData.interview_prep_clean_versions.forEach(({ question, clean_60_second_version }) => {
            learnedSkills[question] = clean_60_second_version;
          });
          localStorage.setItem('learned_skills', JSON.stringify(learnedSkills));
          localStorage.setItem('skills_seeded', 'true');
        }

        if (apps) setSavedApplications(JSON.parse(apps));

        if (profile) {
          setProfileData(JSON.parse(profile));
        } else {
          const glenProfile = {
            resumeText: GLEN_RESUME,
            linkedInUrl: 'linkedin.com/in/glencook'
          };
          localStorage.setItem('resume_profile', JSON.stringify(glenProfile));
          setProfileData(glenProfile);
        }
        setStep('input');
    } catch (error) {
        console.error('Storage error:', error);
        const glenProfile = {
          resumeText: GLEN_RESUME,
          linkedInUrl: 'linkedin.com/in/glencook'
        };
        setProfileData(glenProfile);
        setStep('input');
    }
  };
    const analyzeJobDescription = async () => {
    if (!jobDescription.trim()) {
        alert('Please paste a job description first');
        return;
    }

    setLoading(true);
    
    try {
        // Get learned skills from storage
        let learnedSkills = {};
        let previouslyAskedQuestions = [];
        
        const learned = localStorage.getItem('learned_skills');
        if (learned) learnedSkills = JSON.parse(learned);
        
        // Get all previously asked questions
        const apps = localStorage.getItem('saved_applications');
        if (apps) {
        const savedApps = JSON.parse(apps);
        savedApps.forEach(app => {
            if (app.questions) {
            previouslyAskedQuestions.push(...app.questions);
            }
        });
        }

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
${jobDescription}

Find 3-5 critical requirements that are:
1. Explicitly required in the job posting
2. NOT covered by the candidate's profile or learned skills
3. NOT substantially similar in topic to any previously explored question above — compare by TOPIC, not exact wording. If the same underlying skill or experience has been explored before, skip it entirely.
4. Genuinely new information that would strengthen the application

Your response must be ONLY a valid JSON array — no explanation, no prose, no markdown. Start your response with [ and end with ].

If there are gaps: [{"skill": "requirement name", "question": "question to ask", "why": "why this matters"}, ...]
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

  const generateGuidance = async () => {
    setLoading(true);
    
    try {
      let learnedSkills = {};
      try {
        const learned = localStorage.getItem('learned_skills');
        if (learned) learnedSkills = JSON.parse(learned.value);
      } catch (e) {
        // No learned skills yet
      }

      // Add new answers to learned skills
      Object.entries(answers).forEach(([question, answer]) => {
        const q = questions.find(q => q.question === question);
        if (q && answer.trim()) {
          learnedSkills[q.skill] = answer;
        }
      });

      localStorage.setItem('learned_skills', JSON.stringify(learnedSkills));

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

ADDITIONAL QUALIFICATIONS:
${Object.keys(learnedSkills).length > 0 ? Object.entries(learnedSkills).map(([skill, exp]) => `${skill}: ${exp}`).join('\n') : 'None'}

Provide specific guidance as JSON:
{
  "keyPhrases": ["keyword1", "keyword2", ...],
  "experiencesToHighlight": ["experience to emphasize", ...],
  "skillsToAdd": ["skill from additional qualifications", ...],
  "summaryGuidance": "How to adjust the professional summary",
  "bulletPointExamples": ["example bullet point using their experience", ...]
}

Focus on actionable, specific guidance.`
          }]
        })
      });

      const data = await response.json();
      const text = data.content.map(item => item.type === 'text' ? item.text : '').join('');
      const clean = text.replace(/```json|```/g, '').trim();
      const guidance = JSON.parse(clean);
      
      setTailoringGuidance(guidance);
      
      // Save this application
      const newApp = {
        id: Date.now(),
        date: new Date().toISOString(),
        jobTitle: jobDescription.split('\n')[0].substring(0, 100),
        questions: questions.map(q => q.question),
        answers: answers,
        guidance: guidance
      };
      
      const updatedApps = [...savedApplications, newApp];
      setSavedApplications(updatedApps);
      localStorage.setItem('saved_applications', JSON.stringify(updatedApps));
      
      setStep('result');
    } catch (error) {
      console.error('Guidance error:', error);
      alert('Failed to generate guidance. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyBaseResume = () => {
    navigator.clipboard.writeText(profileData.resumeText);
    alert('✅ Base resume copied to clipboard!');
  };

  const downloadTailoredDocx = async () => {
    setLoading(true);
    try {
        // Get learned skills
        let learnedSkills = {};
        const learned = localStorage.getItem('learned_skills');
        if (learned) learnedSkills = JSON.parse(learned);

        // Generate the tailored resume using API
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
            content: `Create a tailored resume in plain text format.

    BASE RESUME:
    ${profileData.resumeText}

    ADDITIONAL QUALIFICATIONS:
    ${Object.keys(learnedSkills).length > 0 ? Object.entries(learnedSkills).map(([skill, exp]) => `${skill}: ${exp}`).join('\n') : 'None'}

    TARGET JOB:
    ${jobDescription}

    TAILORING GUIDANCE:
    - Keywords: ${tailoringGuidance?.keyPhrases?.join(', ') || 'N/A'}
    - Highlight: ${tailoringGuidance?.experiencesToHighlight?.join('; ') || 'N/A'}
    - Add skills: ${tailoringGuidance?.skillsToAdd?.join(', ') || 'N/A'}

    Instructions:
    1. Use the base resume structure
    2. Incorporate the keywords naturally
    3. Highlight the specified experiences
    4. Add the new skills where relevant
    5. Update the professional summary
    6. Keep it professional and ATS-friendly
    7. Format with clear sections

    Return the complete tailored resume as plain text with clear section headers.`
            }]
            })
        });

        if (!response.ok) {
        throw new Error('Failed to generate resume');
        }

        const data = await response.json();
        const tailoredText = data.content.map(item => item.type === 'text' ? item.text : '').join('');
        
        // Parse the resume text and create DOCX
        const lines = tailoredText.split('\n');
        const docParagraphs = [];

        const NAVY = '1B365D';
        const GRAY = '555555';
        const font = 'Calibri';

        const isAllCaps = (s) => s.length > 3 && s === s.toUpperCase() && !/\d{2}\/\d{4}/.test(s) && !s.includes('@');
        const isDateLine = (s) => /^\d{2}\/\d{4}/.test(s) || /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/.test(s);
        const isCompanyLine = (s) => s.includes('\u2014') || s.includes(' \u2013 ') || (s.includes(',') && !s.includes(':') && !s.startsWith('-'));

        let nameWritten = false;
        let headerDone = false;

        lines.forEach((line, idx) => {
          const trimmed = line.trim();
          const nextTrimmed = (lines[idx + 1] || '').trim();

          if (!trimmed) {
            if (headerDone) {
              docParagraphs.push(new Paragraph({ spacing: { after: 60 } }));
            } else if (nameWritten) {
              headerDone = true;
            }
            return;
          }

          // Name — first non-empty line
          if (!nameWritten) {
            nameWritten = true;
            docParagraphs.push(new Paragraph({
              children: [new TextRun({ text: trimmed, bold: true, size: 40, color: NAVY, font })],
              alignment: AlignmentType.CENTER,
              spacing: { after: 60 },
            }));
            return;
          }

          // Contact / location lines in header block
          if (!headerDone) {
            if (isAllCaps(trimmed)) {
              // Professional headline inside header block
              docParagraphs.push(new Paragraph({
                children: [new TextRun({ text: trimmed, bold: true, size: 22, color: NAVY, font })],
                alignment: AlignmentType.CENTER,
                spacing: { before: 60, after: 80 },
              }));
            } else {
              docParagraphs.push(new Paragraph({
                children: [new TextRun({ text: trimmed, size: 18, color: GRAY, font })],
                alignment: AlignmentType.CENTER,
                spacing: { after: 40 },
              }));
            }
            return;
          }

          // Section headers (all-caps body lines)
          if (isAllCaps(trimmed)) {
            docParagraphs.push(new Paragraph({
              children: [new TextRun({ text: trimmed, bold: true, size: 22, color: NAVY, font })],
              border: { bottom: { color: NAVY, style: BorderStyle.SINGLE, size: 4, space: 4 } },
              spacing: { before: 260, after: 100 },
            }));
            return;
          }

          // Bullet points
          if (/^[-•]\s/.test(line) || /^\s+[-•]\s/.test(line)) {
            const text = trimmed.replace(/^[-•]\s*/, '');
            docParagraphs.push(new Paragraph({
              children: [new TextRun({ text, size: 20, font })],
              bullet: { level: 0 },
              indent: { left: convertInchesToTwip(0.25), hanging: convertInchesToTwip(0.15) },
              spacing: { before: 40, after: 40 },
            }));
            return;
          }

          // Job title: non-bullet line followed by a company line
          if (isCompanyLine(nextTrimmed) && !isAllCaps(trimmed) && !isDateLine(trimmed)) {
            docParagraphs.push(new Paragraph({
              children: [new TextRun({ text: trimmed, bold: true, size: 21, font })],
              spacing: { before: 140, after: 30 },
            }));
            return;
          }

          // Company / location line (contains em-dash or similar)
          if (isCompanyLine(trimmed) && !isAllCaps(trimmed)) {
            docParagraphs.push(new Paragraph({
              children: [new TextRun({ text: trimmed, size: 20, italics: true, color: GRAY, font })],
              spacing: { after: 20 },
            }));
            return;
          }

          // Date range
          if (isDateLine(trimmed)) {
            docParagraphs.push(new Paragraph({
              children: [new TextRun({ text: trimmed, size: 19, italics: true, color: GRAY, font })],
              spacing: { after: 60 },
            }));
            return;
          }

          // Body text
          docParagraphs.push(new Paragraph({
            children: [new TextRun({ text: trimmed, size: 20, font })],
            spacing: { after: 80 },
          }));
        });

        // Create the document with proper margins
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
                  left: convertInchesToTwip(0.75),
                },
              },
            },
            children: docParagraphs,
          }],
        });

        // Generate and download
        const blob = await Packer.toBlob(doc);
        saveAs(blob, 'tailored-resume.docx');
        
        alert('✅ Resume downloaded as DOCX!');
    } catch (error) {
        console.error('DOCX generation error:', error);
        alert(`⚠️ Failed to generate DOCX: ${error.message}\n\nTrying text fallback...`);
        
        // Fallback to text download
        copyBaseResume();
    } finally {
        setLoading(false);
    }
    };

  const downloadTailoredResume = async () => {
    setLoading(true);
    try {
      // Get learned skills
      let learnedSkills = {};
      try {
        const learned = localStorage.getItem('learned_skills');
        if (learned) learnedSkills = JSON.parse(learned.value);
      } catch (e) {
        console.log('No learned skills');
      }

      // Generate the tailored resume using API
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
            content: `Create a tailored resume.

BASE RESUME:
${profileData.resumeText}

ADDITIONAL QUALIFICATIONS:
${Object.keys(learnedSkills).length > 0 ? Object.entries(learnedSkills).map(([skill, exp]) => `${skill}: ${exp}`).join('\n') : 'None'}

TARGET JOB:
${jobDescription}

TAILORING GUIDANCE:
${JSON.stringify(tailoringGuidance, null, 2)}

Instructions:
- Use the base resume structure
- Incorporate keywords: ${tailoringGuidance?.keyPhrases?.join(', ')}
- Highlight: ${tailoringGuidance?.experiencesToHighlight?.join('; ')}
- Add skills: ${tailoringGuidance?.skillsToAdd?.join(', ')}
- Update summary per guidance
- Keep professional format

Return the complete tailored resume as plain text.`
          }]
        })
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      const tailoredText = data.content.map(item => item.type === 'text' ? item.text : '').join('');
      
      // Create simple text download as fallback
      const blob = new Blob([tailoredText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tailored-resume.txt';
      a.click();
      URL.revokeObjectURL(url);
      
      alert('✅ Resume downloaded as TXT file!');
    } catch (error) {
      console.error('Download error:', error);
      alert('⚠️ Could not generate tailored resume. Try the guidance approach or export your data to use with the self-hosted version.');
    } finally {
      setLoading(false);
    }
  };

  const resetForNewJob = () => {
    setJobDescription('');
    setQuestions([]);
    setAnswers({});
    setTailoringGuidance(null);
    setStep('input');
  };

  const exportData = async () => {
    try {
      const profile = localStorage.getItem('resume_profile');
      const apps = localStorage.getItem('saved_applications');
      const skills = localStorage.getItem('learned_skills');
      
      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        profile: profile ? JSON.parse(profile.value) : null,
        savedApplications: apps ? JSON.parse(apps.value) : [],
        learnedSkills: skills ? JSON.parse(skills.value) : {}
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
        localStorage.setItem('resume_profile', JSON.stringify(data.profile));
        setProfileData(data.profile);
      }
      
      if (data.savedApplications) {
        localStorage.setItem('saved_applications', JSON.stringify(data.savedApplications));
        setSavedApplications(data.savedApplications);
      }
      
      if (data.learnedSkills) {
        localStorage.setItem('learned_skills', JSON.stringify(data.learnedSkills));
      }
      
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
      localStorage.removeItem('resume_profile');
      localStorage.removeItem('saved_applications');
      localStorage.removeItem('learned_skills');
      localStorage.removeItem('skills_seeded');
      
      setProfileData(null);
      setSavedApplications([]);
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
      localStorage.setItem('resume_profile', JSON.stringify(editedProfile));
      setProfileData(editedProfile);
      setIsEditingProfile(false);
      alert('✅ Profile updated successfully!');
    } catch (error) {
      console.error('Failed to save profile:', error);
      alert('❌ Failed to save profile');
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
                ✅ Profile loaded: Glen Cook | Infrastructure & Network Engineer
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Base Resume
                  </label>
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
            <li>I'll identify any gaps between the JD and your resume</li>
            <li>Answer a few quick questions about missing qualifications</li>
            <li>Get AI-powered guidance on how to tailor your resume</li>
            <li>Every answer gets saved and used for future applications!</li>
          </ol>
        </div>
      </div>
    );
  }

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
                    <h3 className="font-semibold text-gray-900">{q.skill}</h3>
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

  if (step === 'result') {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Resume Tailoring Guidance</h1>
          <p className="text-gray-600">Use these insights to customize your resume for this role</p>
        </div>

        <div className="mb-6 flex gap-3">
            <button
            onClick={downloadTailoredDocx}
            disabled={loading}
            className="flex-1 bg-purple-600 text-white py-3 px-6 rounded-lg hover:bg-purple-700 transition flex items-center justify-center gap-2 disabled:bg-gray-400"
            >
            <Download size={20} />
            {loading ? 'Generating DOCX...' : 'Download Tailored Resume (DOCX)'}
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

        {tailoringGuidance && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
              <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <Lightbulb size={20} />
                Key Keywords to Include
              </h3>
              <div className="flex flex-wrap gap-2">
                {tailoringGuidance.keyPhrases?.map((phrase, idx) => (
                  <span key={idx} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                    {phrase}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-5">
              <h3 className="font-semibold text-purple-900 mb-3">Professional Summary Guidance</h3>
              <p className="text-purple-800">{tailoringGuidance.summaryGuidance}</p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-5">
              <h3 className="font-semibold text-green-900 mb-3">Experiences to Highlight</h3>
              <ul className="space-y-2">
                {tailoringGuidance.experiencesToHighlight?.map((exp, idx) => (
                  <li key={idx} className="text-green-800 flex items-start gap-2">
                    <span className="text-green-600 mt-1">✓</span>
                    <span>{exp}</span>
                  </li>
                ))}
              </ul>
            </div>

            {tailoringGuidance.skillsToAdd && tailoringGuidance.skillsToAdd.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-5">
                <h3 className="font-semibold text-orange-900 mb-3">Skills to Add from Your Qualifications</h3>
                <ul className="space-y-2">
                  {tailoringGuidance.skillsToAdd.map((skill, idx) => (
                    <li key={idx} className="text-orange-800 flex items-start gap-2">
                      <span className="text-orange-600 mt-1">+</span>
                      <span>{skill}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {tailoringGuidance.bulletPointExamples && tailoringGuidance.bulletPointExamples.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
                <h3 className="font-semibold text-gray-900 mb-3">Example Bullet Points</h3>
                <ul className="space-y-2">
                  {tailoringGuidance.bulletPointExamples.map((bullet, idx) => (
                    <li key={idx} className="text-gray-800 flex items-start gap-2">
                      <span className="text-gray-600 mt-1">•</span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-900 mb-2">📝 Next Steps</h3>
          <ol className="text-sm text-yellow-800 space-y-1 list-decimal list-inside">
            <li>Click "Copy Base Resume" above to copy your resume</li>
            <li>Paste it into your favorite editor (Word, Google Docs, etc.)</li>
            <li>Apply the guidance above to tailor it for this role</li>
            <li>Focus on the keywords, highlighted experiences, and example bullets</li>
          </ol>
        </div>
      </div>
    );
  }

  return null;
};

export default ResumeCustomizer;
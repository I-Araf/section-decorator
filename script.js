const introPage = document.getElementById('introPage');
const plannerPage = document.getElementById('plannerPage');
const createPlanBtn = document.getElementById('createPlanBtn');
const backBtn = document.getElementById('backBtn');
const courseForm = document.getElementById('courseForm');
const courseTableBody = document.getElementById('courseTableBody');
const conflictPanel = document.getElementById('conflictPanel');
const conflictMessage = document.getElementById('conflictMessage');
const completeBtn = document.getElementById('completeBtn');
const downloadPdfBtn = document.getElementById('downloadPdfBtn');
const courseCounter = document.getElementById('courseCounter');
const clearBtn = document.getElementById('clearBtn');
const sampleBtn = document.getElementById('sampleBtn');
const toast = document.getElementById('toast');

let courses = JSON.parse(localStorage.getItem('sectionDecoratorCourses') || '[]');
let lastConflictSignature = '';

const dayMap = {
  sun: 'Sunday', sunday: 'Sunday',
  mon: 'Monday', monday: 'Monday',
  tue: 'Tuesday', tues: 'Tuesday', tuesday: 'Tuesday',
  wed: 'Wednesday', wednesday: 'Wednesday',
  thu: 'Thursday', thur: 'Thursday', thurs: 'Thursday', thursday: 'Thursday',
  fri: 'Friday', friday: 'Friday',
  sat: 'Saturday', saturday: 'Saturday'
};

createPlanBtn.addEventListener('click', () => switchPage('planner'));
backBtn.addEventListener('click', () => switchPage('intro'));

courseForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const course = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    courseName: document.getElementById('courseName').value.trim(),
    dayName: document.getElementById('dayName').value.trim(),
    schedule: document.getElementById('schedule').value.trim(),
    sectionName: document.getElementById('sectionName').value.trim(),
    facultyName: document.getElementById('facultyName').value.trim()
  };

  const parsedSchedule = parseSchedule(course.schedule);
  const parsedDays = parseDays(course.dayName);

  if (!parsedSchedule) {
    showToast('Please use this schedule format: 8:30 AM to 11:10 AM or 08:30 to 11:10.');
    return;
  }

  if (!parsedDays.length) {
    showToast('Please write a valid day name, for example: Sunday and Wednesday.');
    return;
  }

  courses.push(course);
  persist();
  courseForm.reset();
  renderCourses(true);
  showToast('Course added successfully! 🎉');
});

clearBtn.addEventListener('click', () => {
  if (!courses.length) {
    showToast('There is nothing to clear yet.');
    return;
  }

  if (confirm('Do you want to clear the whole course plan?')) {
    courses = [];
    persist();
    downloadPdfBtn.classList.add('hidden');
    lastConflictSignature = '';
    renderCourses(false);
    showToast('All course data cleared.');
  }
});

sampleBtn.addEventListener('click', () => {
  const sampleCourses = [
    {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + 1),
      courseName: 'Theory of Computation',
      dayName: 'Sunday and Wednesday',
      schedule: '8:30 AM to 11:10 AM',
      sectionName: 'E',
      facultyName: 'Fairuz Anika'
    },
    {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + 2),
      courseName: 'Machine Learning',
      dayName: 'Sunday',
      schedule: '10:00 AM to 12:00 PM',
      sectionName: 'B',
      facultyName: 'Dr. Rahman'
    }
  ];

  courses.push(...sampleCourses);
  persist();
  renderCourses(true);
  showToast('Sample courses added. One sample conflict is included for testing the alarm.');
});

completeBtn.addEventListener('click', () => {
  if (!courses.length) {
    showToast('Please add at least one course before completing the plan.');
    return;
  }

  downloadPdfBtn.classList.remove('hidden');
  completeBtn.textContent = 'Plan Completed 🎯';
  showToast('Your plan is completed. Now you can download the PDF.');
});

downloadPdfBtn.addEventListener('click', () => {
  if (!courses.length) {
    showToast('No course data found for PDF download.');
    return;
  }

  const conflicts = findConflicts(courses);
  downloadPdf(courses, conflicts);
  showToast('PDF download started. 📄');
});

function switchPage(page) {
  if (page === 'planner') {
    introPage.classList.remove('active-page');
    plannerPage.classList.add('active-page');
  } else {
    plannerPage.classList.remove('active-page');
    introPage.classList.add('active-page');
  }
}

function persist() {
  localStorage.setItem('sectionDecoratorCourses', JSON.stringify(courses));
}

function renderCourses(shouldAlarm) {
  const conflicts = findConflicts(courses);
  const conflictIds = new Set(conflicts.flatMap(conflict => [conflict.first.id, conflict.second.id]));
  const signature = conflicts.map(conflict => `${conflict.day}:${conflict.first.id}:${conflict.second.id}:${conflict.overlap}`).join('|');

  courseCounter.textContent = courses.length
    ? `${courses.length} course${courses.length > 1 ? 's' : ''} added.`
    : 'No courses added yet.';

  if (!courses.length) {
    courseTableBody.innerHTML = `<tr class="empty-row"><td colspan="6">Your colorful course plan will appear here 🌟</td></tr>`;
  } else {
    courseTableBody.innerHTML = courses.map(course => `
      <tr class="${conflictIds.has(course.id) ? 'conflict-row' : ''}">
        <td>${escapeHtml(course.courseName)}</td>
        <td>${escapeHtml(course.dayName)}</td>
        <td>${escapeHtml(course.schedule)}</td>
        <td>${escapeHtml(course.sectionName)}</td>
        <td>${escapeHtml(course.facultyName)}</td>
        <td><button class="action-btn delete-btn" onclick="deleteCourse('${course.id}')">Delete</button></td>
      </tr>
    `).join('');
  }

  if (conflicts.length) {
    conflictPanel.classList.remove('hidden');
    conflictMessage.innerHTML = conflicts.map(conflict => {
      return `<strong>${escapeHtml(conflict.first.courseName)}</strong> conflicts with <strong>${escapeHtml(conflict.second.courseName)}</strong> on <strong>${conflict.day}</strong> during <strong>${conflict.overlap}</strong>.`;
    }).join('<br>');

    if (shouldAlarm && signature !== lastConflictSignature) {
      playAlarm();
      showToast('Alarm! Course time conflict detected. 🚨');
    }
  } else {
    conflictPanel.classList.add('hidden');
  }

  lastConflictSignature = signature;
}

window.deleteCourse = function deleteCourse(id) {
  courses = courses.filter(course => course.id !== id);
  persist();
  renderCourses(false);
  showToast('Course deleted.');
};

function parseDays(dayText) {
  return dayText
    .toLowerCase()
    .replace(/\band\b/g, ',')
    .replace(/[&/+]/g, ',')
    .split(',')
    .map(day => day.trim())
    .filter(Boolean)
    .map(day => dayMap[day] || dayMap[day.slice(0, 3)])
    .filter(Boolean);
}

function parseSchedule(scheduleText) {
  const cleaned = scheduleText
    .trim()
    .replace(/[–—]/g, '-')
    .replace(/\s+to\s+/i, ' - ');

  const parts = cleaned.split(/\s*-\s*/);
  if (parts.length !== 2) return null;

  let startPart = parts[0].trim();
  let endPart = parts[1].trim();
  const startSuffix = getSuffix(startPart);
  const endSuffix = getSuffix(endPart);

  if (!startSuffix && endSuffix) startPart += ` ${endSuffix}`;
  if (startSuffix && !endSuffix) endPart += ` ${startSuffix}`;

  const start = parseTime(startPart);
  const end = parseTime(endPart);

  if (start === null || end === null || start >= end) return null;

  return { start, end, label: `${formatMinutes(start)} to ${formatMinutes(end)}` };
}

function getSuffix(text) {
  const match = text.match(/\b(AM|PM)\b/i);
  return match ? match[1].toUpperCase() : '';
}

function parseTime(timeText) {
  const match = timeText.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const suffix = match[3] ? match[3].toUpperCase() : '';

  if (minute > 59) return null;

  if (suffix) {
    if (hour < 1 || hour > 12) return null;
    if (suffix === 'AM' && hour === 12) hour = 0;
    if (suffix === 'PM' && hour !== 12) hour += 12;
  } else {
    if (hour > 23) return null;
  }

  return hour * 60 + minute;
}

function formatMinutes(totalMinutes) {
  const hour24 = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  const suffix = hour24 >= 12 ? 'PM' : 'AM';
  let hour12 = hour24 % 12;
  if (hour12 === 0) hour12 = 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`;
}

function findConflicts(courseList) {
  const conflicts = [];
  const parsed = courseList.map(course => ({
    ...course,
    days: parseDays(course.dayName),
    time: parseSchedule(course.schedule)
  })).filter(course => course.time && course.days.length);

  for (let i = 0; i < parsed.length; i++) {
    for (let j = i + 1; j < parsed.length; j++) {
      const commonDays = parsed[i].days.filter(day => parsed[j].days.includes(day));

      for (const day of commonDays) {
        const overlapStart = Math.max(parsed[i].time.start, parsed[j].time.start);
        const overlapEnd = Math.min(parsed[i].time.end, parsed[j].time.end);

        if (overlapStart < overlapEnd) {
          conflicts.push({
            day,
            first: parsed[i],
            second: parsed[j],
            overlap: `${formatMinutes(overlapStart)} to ${formatMinutes(overlapEnd)}`
          });
        }
      }
    }
  }

  return conflicts;
}

function playAlarm() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const context = new AudioContext();
    const now = context.currentTime;

    for (let i = 0; i < 4; i++) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(i % 2 === 0 ? 780 : 540, now + i * 0.22);
      gain.gain.setValueAtTime(0.0001, now + i * 0.22);
      gain.gain.exponentialRampToValueAtTime(0.18, now + i * 0.22 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.22 + 0.16);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now + i * 0.22);
      oscillator.stop(now + i * 0.22 + 0.18);
    }
  } catch (error) {
    console.warn('Alarm sound could not be played:', error);
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.remove('hidden');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.add('hidden'), 3300);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function downloadPdf(courseList, conflicts) {
  const pdfBytes = buildPlanPdf(courseList, conflicts);
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'section-decorator-plan.pdf';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildPlanPdf(courseList, conflicts) {
  const pageWidth = 842;
  const pageHeight = 595;
  const margin = 34;
  const rowHeight = 35;
  const headerHeight = 34;
  const startY = 470;
  const rowsPerPage = 10;
  const colX = [34, 208, 342, 475, 580, 802];
  const headers = ['Course Name', 'Day Name', 'Schedule', 'Section', 'Faculty Name'];

  const pages = [];
  const totalPages = Math.max(1, Math.ceil(courseList.length / rowsPerPage));

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    const rows = courseList.slice(pageIndex * rowsPerPage, (pageIndex + 1) * rowsPerPage);
    let content = '';

    content += rect(0, 0, pageWidth, pageHeight, '0.95 0.98 1 rg f');
    content += rect(22, 22, pageWidth - 44, pageHeight - 44, '1 1 1 rg 0.82 0.74 1 RG 1.5 w S');
    content += text(38, 548, 'Section Decorator Course Plan', 24, true);
    content += text(38, 526, `Generated from your colorful course planner | Page ${pageIndex + 1} of ${totalPages}`, 10);

    if (pageIndex === 0) {
      const conflictLine = conflicts.length
        ? `Conflict Alarm: ${conflicts.length} conflict${conflicts.length > 1 ? 's' : ''} found.`
        : 'Conflict Alarm: No time conflict found.';
      content += text(38, 505, conflictLine, 11, conflicts.length > 0);
    }

    content += rect(margin, startY, pageWidth - margin * 2, headerHeight, '0.56 0.36 1 rg f');
    headers.forEach((header, index) => {
      content += text(colX[index] + 7, startY + 12, header, 9, true, '1 1 1');
    });

    let y = startY - rowHeight;
    rows.forEach((course, rowIndex) => {
      const hasConflict = conflicts.some(conflict => conflict.first.id === course.id || conflict.second.id === course.id);
      content += rect(margin, y, pageWidth - margin * 2, rowHeight, hasConflict ? '1 0.91 0.94 rg f' : rowIndex % 2 === 0 ? '1 1 1 rg f' : '0.96 0.98 1 rg f');
      content += line(margin, y, pageWidth - margin, y, '0.85 0.82 0.95 RG 0.8 w S');
      const values = [course.courseName, course.dayName, course.schedule, course.sectionName, course.facultyName];
      values.forEach((value, index) => {
        const maxChars = [27, 20, 20, 12, 27][index];
        content += text(colX[index] + 7, y + 14, truncate(value, maxChars), 8.5, false);
      });
      y -= rowHeight;
    });

    if (pageIndex === totalPages - 1 && conflicts.length) {
      let conflictY = Math.max(78, y - 12);
      content += text(38, conflictY, 'Conflict Details:', 11, true);
      conflictY -= 16;
      conflicts.slice(0, 8).forEach(conflict => {
        const message = `${conflict.first.courseName} conflicts with ${conflict.second.courseName} on ${conflict.day}, ${conflict.overlap}`;
        content += text(48, conflictY, `- ${truncate(message, 118)}`, 8.5);
        conflictY -= 13;
      });
      if (conflicts.length > 8) {
        content += text(48, conflictY, `- More ${conflicts.length - 8} conflict(s) hidden due to space.`, 8.5);
      }
    }

    content += text(38, 42, 'Made with Section Decorator | Animated colorful course planning software', 8);
    pages.push(content);
  }

  return makePdf(pages, pageWidth, pageHeight);
}

function truncate(value, max) {
  const textValue = String(value || '');
  return textValue.length > max ? `${textValue.slice(0, max - 3)}...` : textValue;
}

function pdfEscape(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '');
}

function text(x, y, value, size = 10, bold = false, color = '0.13 0.13 0.25') {
  return `BT ${color} rg /${bold ? 'F2' : 'F1'} ${size} Tf ${x} ${y} Td (${pdfEscape(value)}) Tj ET\n`;
}

function rect(x, y, w, h, style) {
  return `${x} ${y} ${w} ${h} re ${style}\n`;
}

function line(x1, y1, x2, y2, style) {
  return `${x1} ${y1} m ${x2} ${y2} l ${style}\n`;
}

function makePdf(pageContents, pageWidth, pageHeight) {
  const objects = [];
  const addObject = body => {
    objects.push(body);
    return objects.length;
  };

  const catalogId = addObject('');
  const pagesId = addObject('');
  const fontRegularId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const fontBoldId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const pageIds = [];

  pageContents.forEach(content => {
    const contentId = addObject(`<< /Length ${content.length} >>\nstream\n${content}endstream`);
    const pageId = addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    pageIds.push(pageId);
  });

  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;

  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  objects.forEach((body, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  offsets.slice(1).forEach(offset => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) {
    bytes[i] = pdf.charCodeAt(i) & 0xff;
  }
  return bytes;
}

renderCourses(false);

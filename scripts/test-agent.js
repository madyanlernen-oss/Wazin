import fs from 'fs';
import path from 'path';

// اختبار قراءة تعليمات الخبير المالي من مجلد Agents
let agentPath = path.join(process.cwd(), 'Agents', '01-financial.md');
if (!fs.existsSync(agentPath)) {
  agentPath = path.join(process.cwd(), 'agents', '01-financial.md');
}

if (fs.existsSync(agentPath)) {
  const instructions = fs.readFileSync(agentPath, 'utf8');
  console.log("✅ نجح الاتصال وقراءة الخبير المالي بنجاح!");
  console.log("-----------------------------------------");
  console.log(instructions);
} else {
  console.log("❌ لم يتم العثور على ملف الخبير، تحقق من المسار.");
}
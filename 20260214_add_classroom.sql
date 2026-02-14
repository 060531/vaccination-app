BEGIN;

-- ✅ เปลี่ยน patients เป็นชื่อตารางจริงของข้อมูลพื้นฐาน
ALTER TABLE patients ADD COLUMN IF NOT EXISTS classroom VARCHAR(3);

ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_classroom_chk;

ALTER TABLE patients
ADD CONSTRAINT patients_classroom_chk
CHECK (classroom IN (
  '1/1','1/2','1/3',
  '2/1','2/2','2/3',
  '3/1','3/2','3/3',
  '4/1','4/2','4/3'
));

-- ✅ ถ้าจะ “เอารหัสผู้ป่วยออก” ให้ปลดคอมเมนต์เฉพาะคอลัมน์ที่มีจริง
-- ALTER TABLE patients DROP COLUMN IF EXISTS patient_code;
-- ALTER TABLE patients DROP COLUMN IF EXISTS hn;

COMMIT;

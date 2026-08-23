import React, { useState, useEffect } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { Student, Address, Parent, StudentPotential, Gender, StudentStatus } from '../../types';
import { X, Save, User, MapPin, Heart, Sparkles } from 'lucide-react';

interface StudentFormModalProps {
  studentId?: string | null;
  onClose: () => void;
}

export const StudentFormModal: React.FC<StudentFormModalProps> = ({ studentId, onClose }) => {
  const { db, addStudent, updateStudent, getStudentById, activeClass, activeAcademicYear } = useDatabase();

  const isEditing = !!studentId;
  const existingData = studentId ? getStudentById(studentId) : null;

  const [activeFormTab, setActiveFormTab] = useState<'biodata' | 'address' | 'parents' | 'potential'>('biodata');

  // Biodata State
  const [fullName, setFullName] = useState('');
  const [nis, setNis] = useState('');
  const [nisn, setNisn] = useState('');
  const [gender, setGender] = useState<Gender>('L');
  const [birthPlace, setBirthPlace] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [nik, setNik] = useState('');
  const [religion, setReligion] = useState('Islam');
  const [phone, setPhone] = useState('');
  const [previousSchool, setPreviousSchool] = useState('');
  const [status, setStatus] = useState<StudentStatus>('Aktif');
  const [classId, setClassId] = useState(activeClass?.class_id || '');

  // Address State
  const [rt, setRt] = useState('');
  const [rw, setRw] = useState('');
  const [dusun, setDusun] = useState('');
  const [desa, setDesa] = useState('');
  const [kecamatan, setKecamatan] = useState('');
  const [kabupaten, setKabupaten] = useState('');
  const [fullAddress, setFullAddress] = useState('');

  // Parents State
  const [fatherName, setFatherName] = useState('');
  const [fatherJob, setFatherJob] = useState('');
  const [motherName, setMotherName] = useState('');
  const [motherJob, setMotherJob] = useState('');
  const [parentPhone, setParentPhone] = useState('');

  // Potential State
  const [interests, setInterests] = useState('');
  const [talents, setTalents] = useState('');
  const [skills, setSkills] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (existingData) {
      const s = existingData.student;
      const a = existingData.address;
      const p = existingData.parent;
      const pot = existingData.potential;

      setFullName(s.full_name || '');
      setNis(s.nis || '');
      setNisn(s.nisn || '');
      setGender(s.gender || 'L');
      setBirthPlace(s.birth_place || '');
      setBirthDate(s.birth_date || '');
      setNik(s.nik || '');
      setReligion(s.religion || 'Islam');
      setPhone(s.phone || '');
      setPreviousSchool(s.previous_school || '');
      setStatus(s.status || 'Aktif');

      if (a) {
        setRt(a.rt || '');
        setRw(a.rw || '');
        setDusun(a.dusun || '');
        setDesa(a.desa || '');
        setKecamatan(a.kecamatan || '');
        setKabupaten(a.kabupaten || '');
        setFullAddress(a.full_address || '');
      }

      if (p) {
        setFatherName(p.father_name || '');
        setFatherJob(p.father_job || '');
        setMotherName(p.mother_name || '');
        setMotherJob(p.mother_job || '');
        setParentPhone(p.parent_phone || '');
      }

      if (pot) {
        setInterests(pot.interests || '');
        setTalents(pot.talents || '');
        setSkills(pot.skills || '');
        setNotes(pot.notes || '');
      }
    }
  }, [existingData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      alert('Nama lengkap siswa wajib diisi.');
      return;
    }

    const studentPayload: Omit<Student, 'student_id' | 'created_at' | 'updated_at'> = {
      full_name: fullName.trim(),
      nis: nis.trim(),
      nisn: nisn.trim(),
      gender,
      birth_place: birthPlace.trim(),
      birth_date: birthDate,
      nik: nik.trim(),
      religion,
      phone: phone.trim(),
      previous_school: previousSchool.trim(),
      status,
    };

    const addressPayload: Omit<Address, 'address_id' | 'student_id'> = {
      rt: rt.trim(),
      rw: rw.trim(),
      dusun: dusun.trim(),
      desa: desa.trim(),
      kecamatan: kecamatan.trim(),
      kabupaten: kabupaten.trim(),
      full_address: fullAddress.trim() || [dusun, rt ? `RT ${rt}` : '', rw ? `RW ${rw}` : '', desa].filter(Boolean).join(', '),
    };

    const parentPayload: Omit<Parent, 'parent_id' | 'student_id'> = {
      father_name: fatherName.trim(),
      father_job: fatherJob.trim(),
      mother_name: motherName.trim(),
      mother_job: motherJob.trim(),
      parent_phone: parentPhone.trim(),
    };

    const potentialPayload: Omit<StudentPotential, 'potential_id' | 'student_id' | 'updated_at'> = {
      interests: interests.trim(),
      talents: talents.trim(),
      skills: skills.trim(),
      notes: notes.trim(),
    };

    if (isEditing && studentId) {
      updateStudent(studentId, studentPayload, addressPayload, parentPayload, potentialPayload);
    } else {
      addStudent(studentPayload, addressPayload, parentPayload, potentialPayload, classId);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold">
              {isEditing ? `Edit Data Siswa: ${existingData?.student.full_name}` : 'Tambah Siswa Baru'}
            </h3>
            <p className="text-xs text-slate-400">
              {isEditing ? `ID Siswa: ${existingData?.student.student_id}` : 'Student ID akan dibuat otomatis berurutan (STU-xxxxx)'}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-100 dark:bg-slate-800/80 px-4 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center space-x-2">
          {[
            { id: 'biodata', label: '1. Biodata Siswa', icon: User },
            { id: 'address', label: '2. Data Alamat', icon: MapPin },
            { id: 'parents', label: '3. Data Orang Tua', icon: Heart },
            { id: 'potential', label: '4. Minat & Bakat', icon: Sparkles },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeFormTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFormTab(tab.id as any)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  isActive ? 'bg-blue-600 text-white shadow' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {activeFormTab === 'biodata' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Nama Lengkap Siswa *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Contoh: AZIZ ZUHRIANSYAH"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Jenis Kelamin
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as Gender)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Nomor Induk Siswa (NIS)
                  </label>
                  <input
                    type="text"
                    value={nis}
                    onChange={(e) => setNis(e.target.value)}
                    placeholder="Contoh: 26271001"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    NISN (Nomor Induk Siswa Nasional)
                  </label>
                  <input
                    type="text"
                    value={nisn}
                    onChange={(e) => setNisn(e.target.value)}
                    placeholder="Contoh: 0082194812"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Tempat Lahir
                  </label>
                  <input
                    type="text"
                    value={birthPlace}
                    onChange={(e) => setBirthPlace(e.target.value)}
                    placeholder="Contoh: Bandung"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Tanggal Lahir
                  </label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Agama
                  </label>
                  <select
                    value={religion}
                    onChange={(e) => setReligion(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="Islam">Islam</option>
                    <option value="Kristen Protestan">Kristen Protestan</option>
                    <option value="Katolik">Katolik</option>
                    <option value="Hindu">Hindu</option>
                    <option value="Buddha">Buddha</option>
                    <option value="Konghucu">Konghucu</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Asal Sekolah (SMP/MTs)
                  </label>
                  <input
                    type="text"
                    value={previousSchool}
                    onChange={(e) => setPreviousSchool(e.target.value)}
                    placeholder="Contoh: SMP Negeri 2 Sukamaju"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    No. Handphone Siswa
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="08xxxxxxxxxx"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Status Siswa
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as StudentStatus)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Lulus">Lulus</option>
                    <option value="Pindah">Pindah</option>
                    <option value="Keluar">Keluar</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeFormTab === 'address' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">RT</label>
                  <input
                    type="text"
                    value={rt}
                    onChange={(e) => setRt(e.target.value)}
                    placeholder="02"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">RW</label>
                  <input
                    type="text"
                    value={rw}
                    onChange={(e) => setRw(e.target.value)}
                    placeholder="05"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Dusun / Kampung</label>
                  <input
                    type="text"
                    value={dusun}
                    onChange={(e) => setDusun(e.target.value)}
                    placeholder="Sukaluyu"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Desa / Kelurahan</label>
                  <input
                    type="text"
                    value={desa}
                    onChange={(e) => setDesa(e.target.value)}
                    placeholder="Mekarsari"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Alamat Lengkap / Petunjuk Lokasi Rumah
                </label>
                <textarea
                  rows={3}
                  value={fullAddress}
                  onChange={(e) => setFullAddress(e.target.value)}
                  placeholder="Contoh: Kp. Sukaluyu RT 02 / RW 05, Desa Mekarsari, Kec. Sukamaju (Dekat Masjid Al-Ikhlas)"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {activeFormTab === 'parents' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Nama Ayah</label>
                  <input
                    type="text"
                    value={fatherName}
                    onChange={(e) => setFatherName(e.target.value)}
                    placeholder="Dedi Kurniawan"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Pekerjaan Ayah</label>
                  <input
                    type="text"
                    value={fatherJob}
                    onChange={(e) => setFatherJob(e.target.value)}
                    placeholder="Wiraswasta / Bengkel Las"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Nama Ibu</label>
                  <input
                    type="text"
                    value={motherName}
                    onChange={(e) => setMotherName(e.target.value)}
                    placeholder="Siti Maryam"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Pekerjaan Ibu</label>
                  <input
                    type="text"
                    value={motherJob}
                    onChange={(e) => setMotherJob(e.target.value)}
                    placeholder="Ibu Rumah Tangga / Pedagang"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Nomor HP / WhatsApp Orang Tua (Narahubung Utama)
                </label>
                <input
                  type="text"
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  placeholder="081321456789"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {activeFormTab === 'potential' && (
            <div className="space-y-4">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Minat (Interests)</label>
                <input
                  type="text"
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                  placeholder="Contoh: Modifikasi mesin, kelistrikan bodi, otomasi bengkel"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Bakat (Talents)</label>
                <input
                  type="text"
                  value={talents}
                  onChange={(e) => setTalents(e.target.value)}
                  placeholder="Contoh: Analisis kerusakan EFI, ketelitian pengukuran presisi"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Keterampilan Khusus (Skills)</label>
                <input
                  type="text"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="Contoh: Wiring diagram reading, Scanner OBD-II, las listrik dasar"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Catatan Tambahan Potensi Siswa</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Rekomendasi magang industri atau persiapan lomba kejuruan..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* Footer Save Button */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-semibold rounded-xl cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center space-x-1.5 shadow-md cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isEditing ? 'Simpan Perubahan' : 'Daftarkan Siswa'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

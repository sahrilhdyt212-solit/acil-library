import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

export interface CertificatePDFData {
  name: string;
  courseTitle: string;
  provider: string;
  description: string;
  durationText: string;
  outcomes: string[];
  syllabus: string[];
  avgScore: number | null;
  issuedDate: string;
  code: string;
  verifyUrl: string;
  qrDataUri: string;
  ttdImageDataUri: string | null;
  ttdName: string | null;
  ttdTitle: string | null;
}

const INK = "#1d1d1f";
const ACCENT = "#1c3a2e";
const GRAY = "#57534d";

const s = StyleSheet.create({
  page: { padding: 56, fontFamily: "Helvetica", color: INK, backgroundColor: "#ffffff" },
  center: { textAlign: "center" },
  brand: { fontSize: 11, letterSpacing: 3, color: GRAY, textAlign: "center", fontFamily: "Helvetica-Bold" },
  ribbon: { marginTop: 14, alignItems: "center" },
  ribbonBar: { width: 44, height: 120, backgroundColor: ACCENT },
  ribbonMedal: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#ffffff",
    color: ACCENT,
    fontSize: 16,
    textAlign: "center",
    paddingTop: 8,
    marginTop: -24,
    fontFamily: "Helvetica-Bold",
  },
  certTitle: { marginTop: 18, fontSize: 20, color: ACCENT, textAlign: "center", fontFamily: "Helvetica-Bold" },
  name: { marginTop: 26, fontSize: 34, textAlign: "center", fontFamily: "Helvetica-Bold" },
  muted: { marginTop: 10, fontSize: 11, color: GRAY, textAlign: "center" },
  courseTitle: { marginTop: 8, fontSize: 13, textAlign: "center", fontFamily: "Helvetica-Bold" },
  provider: { marginTop: 2, fontSize: 11, color: GRAY, textAlign: "center", fontFamily: "Helvetica-Bold" },
  blurb: { marginTop: 14, fontSize: 10.5, color: GRAY, textAlign: "center", lineHeight: 1.6 },
  duration: { marginTop: 12, fontSize: 11, color: GRAY, textAlign: "center" },
  signBlock: { marginTop: 30, alignItems: "center" },
  signImage: { width: 150, height: 60, objectFit: "contain" },
  signName: { marginTop: 4, fontSize: 11, fontFamily: "Helvetica-Bold", textAlign: "center" },
  signTitle: { fontSize: 10, color: GRAY, textAlign: "center" },
  bottomRow: { marginTop: 34, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  verifyText: { fontSize: 8.5, color: GRAY, maxWidth: 300, lineHeight: 1.5 },
  qr: { width: 84, height: 84 },
  finePrint: { marginTop: 26, fontSize: 7.5, color: GRAY, textAlign: "center", lineHeight: 1.5 },
  // Transcript
  transcriptLabel: { fontSize: 11, letterSpacing: 3, color: GRAY, fontFamily: "Helvetica-Bold" },
  tName: { marginTop: 10, fontSize: 22, fontFamily: "Helvetica-Bold" },
  tCourse: { marginTop: 8, fontSize: 12, fontFamily: "Helvetica-Bold" },
  scoreRow: { marginTop: 6, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  scoreCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 1.5,
    borderColor: GRAY,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreNum: { fontSize: 20, fontFamily: "Helvetica-Bold", textAlign: "center" },
  scoreLbl: { fontSize: 7.5, color: GRAY, textAlign: "center" },
  divider: { marginTop: 10, borderBottomWidth: 1, borderBottomColor: "#d6d3d1" },
  twoCol: { marginTop: 14, flexDirection: "row", gap: 24 },
  col: { flex: 1 },
  body: { fontSize: 10, color: "#44403b", lineHeight: 1.65 },
  h3: { marginTop: 12, fontSize: 11, fontFamily: "Helvetica-Bold" },
  bullet: { fontSize: 10, color: "#44403b", lineHeight: 1.65, marginTop: 3, paddingLeft: 10 },
  footer: { marginTop: 24, fontSize: 7.5, color: GRAY, lineHeight: 1.5 },
});

export function CertificatePDF({ d }: { d: CertificatePDFData }) {
  return (
    <Document
      title={`Sertifikat - ${d.name} - ${d.courseTitle}`}
      author="Acil Library"
      subject={`Sertifikat penyelesaian ${d.courseTitle}`}
    >
      {/* ── Halaman 1: Sertifikat ── */}
      <Page size="A4" style={s.page}>
        <Text style={s.brand}>ACIL LIBRARY</Text>
        <View style={s.ribbon}>
          <View style={s.ribbonBar} />
          <Text style={s.ribbonMedal}>★</Text>
        </View>
        <Text style={s.certTitle}>Sertifikat Pencapaian</Text>
        <Text style={s.name}>{d.name}</Text>
        <Text style={s.muted}>telah menyelesaikan kursus berikut:</Text>
        <Text style={s.courseTitle}>{d.courseTitle.toUpperCase()}</Text>
        <Text style={s.provider}>{d.provider.toUpperCase()}</Text>
        <Text style={s.blurb}>{d.description}</Text>
        <Text style={s.duration}>{d.durationText}</Text>

        <View style={s.signBlock}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf Image tidak mendukung alt */}
          {d.ttdImageDataUri && <Image src={d.ttdImageDataUri} style={s.signImage} />}
          {d.ttdName && <Text style={s.signName}>{d.ttdName}</Text>}          {d.ttdTitle && <Text style={s.signTitle}>{d.ttdTitle}</Text>}
          {d.provider && <Text style={s.signTitle}>{d.provider}</Text>}
        </View>

        <View style={s.bottomRow}>
          <Text style={s.verifyText}>
            Diterbitkan {d.issuedDate}. Verifikasi keaslian: {d.verifyUrl}
          </Text>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf Image tidak mendukung alt */}
          <Image src={d.qrDataUri} style={s.qr} />
        </View>

        <Text style={s.finePrint}>
          Orang yang namanya tercantum pada sertifikat ini telah menyelesaikan seluruh
          aktivitas kursus. Sertifikat ini adalah bukti belajar, bukan kualifikasi formal,
          gelar, atau bagian dari gelar. Kode: {d.code}
        </Text>
      </Page>

      {/* ── Halaman 2: Transkrip ── */}
      <Page size="A4" style={s.page}>
        <Text style={s.transcriptLabel}>TRANSKRIP</Text>
        <Text style={s.tName}>{d.name}</Text>
        <Text style={s.muted}>telah menyelesaikan kursus berikut:</Text>
        <View style={s.scoreRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.tCourse}>{d.courseTitle.toUpperCase()}</Text>
            <Text style={[s.provider, { textAlign: "left" }]}>{d.provider.toUpperCase()}</Text>
          </View>
          {d.avgScore !== null && (
            <View style={s.scoreCircle}>
              <Text style={s.scoreNum}>{d.avgScore}%</Text>
              <Text style={s.scoreLbl}>NILAI{"\n"}KESELURUHAN</Text>
            </View>
          )}
        </View>
        <View style={s.divider} />

        <View style={s.twoCol}>
          <View style={s.col}>
            <Text style={s.body}>{d.description}</Text>
            <Text style={s.h3}>KEBUTUHAN BELAJAR</Text>
            <Text style={s.body}>{d.durationText}</Text>
            {d.outcomes.length > 0 && (
              <>
                <Text style={s.h3}>CAPAIAN BELAJAR</Text>
                {d.outcomes.map((o, i) => (
                  <Text key={i} style={s.bullet}>• {o}</Text>
                ))}
              </>
            )}
          </View>
          <View style={s.col}>
            {d.syllabus.length > 0 && (
              <>
                <Text style={[s.h3, { marginTop: 0 }]}>SILABUS</Text>
                {d.syllabus.map((t, i) => (
                  <Text key={i} style={s.bullet}>• {t}</Text>
                ))}
              </>
            )}
          </View>
        </View>

        <Text style={s.footer}>
          Transkrip ini dibaca bersama Sertifikat Pencapaian pendamping. Diterbitkan{" "}
          {d.issuedDate}. {d.verifyUrl}
        </Text>
      </Page>
    </Document>
  );
}

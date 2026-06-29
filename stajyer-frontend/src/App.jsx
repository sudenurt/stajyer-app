import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./App.css";

function App() {
  const [stajyerler, setStajyerler] = useState([]);
  const [arama, setArama] = useState("");
  const [filtre, setFiltre] = useState("all");
  const [fotoYukleniyor, setFotoYukleniyor] = useState(false);
  const [kayitYapiliyor, setKayitYapiliyor] = useState(false);
  const [tema, setTema] = useState(localStorage.getItem("tema") || "light");
  const [dil, setDil] = useState(localStorage.getItem("dil") || "tr");
  const [dialog, setDialog] = useState(null);

  const [form, setForm] = useState({
    ad: "",
    soyad: "",
    departman: "",
    baslangic_tarihi: "",
    bitis_tarihi: "",
    foto_url: "",
  });

  const stajyerleriGetir = async () => {
    const { data, error } = await supabase
      .from("stajyerler")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      setDialog({
        type: "info",
        title: "Hata",
        message: "Veriler alinamadi: " + error.message,
      });
      return;
    }

    setStajyerler(data || []);
  };

  useEffect(() => {
    stajyerleriGetir();
  }, []);

  useEffect(() => {
    document.body.className = tema === "dark" ? "dark" : "";
    localStorage.setItem("tema", tema);
  }, [tema]);

  useEffect(() => {
    localStorage.setItem("dil", dil);
  }, [dil]);

  const bildirim = (text) => {
    setDialog({
      type: "info",
      title: "Bilgi",
      message: text,
    });
  };

  const tarihFormatla = (date) => {
    if (!date) return "";
    const yil = date.getFullYear();
    const ay = String(date.getMonth() + 1).padStart(2, "0");
    const gun = String(date.getDate()).padStart(2, "0");
    return `${yil}-${ay}-${gun}`;
  };

  const isimFormatla = (value) => {
    return value
      .trim()
      .toLocaleLowerCase("tr-TR")
      .replace(/(^|[\s'-])(\p{L})/gu, (_, ayirici, harf) => {
        return `${ayirici}${harf.toLocaleUpperCase("tr-TR")}`;
      });
  };

  const fotografYukle = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFotoYukleniyor(true);

    const uzanti = file.name.split(".").pop();
    const fileName = `stajyer-${Date.now()}.${uzanti}`;

    const { error } = await supabase.storage
      .from("stajyer-fotograflari")
      .upload(fileName, file);

    if (error) {
      setDialog({
        type: "info",
        title: "Hata",
        message: "Fotograf yuklenemedi: " + error.message,
      });
      setFotoYukleniyor(false);
      return;
    }

    const { data } = supabase.storage
      .from("stajyer-fotograflari")
      .getPublicUrl(fileName);

    setForm((prev) => ({ ...prev, foto_url: data.publicUrl }));
    setFotoYukleniyor(false);
  };

  const stajyerEkle = async (e) => {
    e.preventDefault();

    if (kayitYapiliyor) {
      bildirim("Kayıt zaten alınıyor.");
      return;
    }

    if (!form.ad || !form.soyad || !form.baslangic_tarihi || !form.bitis_tarihi) {
      setDialog({
        type: "info",
        title: "Eksik bilgi",
        message: "Ad, soyad, baslangic tarihi ve bitis tarihi zorunludur.",
      });
      return;
    }

    if (new Date(form.bitis_tarihi) < new Date(form.baslangic_tarihi)) {
      setDialog({
        type: "info",
        title: "Tarih kontrolu",
        message: "Bitis tarihi baslangic tarihinden once olamaz.",
      });
      return;
    }

    setKayitYapiliyor(true);

    const { error } = await supabase.from("stajyerler").insert([
      {
        ad: isimFormatla(form.ad),
        soyad: isimFormatla(form.soyad),
        departman: form.departman,
        baslangic_tarihi: form.baslangic_tarihi,
        bitis_tarihi: form.bitis_tarihi,
        foto_url: form.foto_url,
        statu: "Staj Planlandı",
      },
    ]);

    if (error) {
      setDialog({
        type: "info",
        title: "Hata",
        message: "Kayit eklenemedi: " + error.message,
      });
      setKayitYapiliyor(false);
      return;
    }

    setForm({
      ad: "",
      soyad: "",
      departman: "",
      baslangic_tarihi: "",
      bitis_tarihi: "",
      foto_url: "",
    });

    await stajyerleriGetir();
    setKayitYapiliyor(false);
    bildirim("Kayıt başarıyla alınmıştır.");
  };

  const stajyerSil = (stajyer) => {
    setDialog({
      type: "delete",
      title: "Kaydi sil",
      message: `${stajyer.ad} ${stajyer.soyad} kaydi silinsin mi?`,
      stajyer,
    });
  };

  const stajyerSilOnayla = async (stajyer) => {
    const id = stajyer.id;

    const { error } = await supabase.from("stajyerler").delete().eq("id", id);

    if (error) {
      setDialog({
        type: "info",
        title: "Hata",
        message: "Silme hatasi: " + error.message,
      });
      return;
    }

    await stajyerleriGetir();
    setDialog(null);
    bildirim("Kayit silindi.");
  };

  const detaylariGor = (stajyer) => {
    setDialog({
      type: "details",
      title: `${stajyer.ad} ${stajyer.soyad}`,
      stajyer,
    });
  };

  const statuDegistir = (stajyer) => {
    setDialog({
      type: "status",
      title: "Statu degistir",
      stajyer,
    });
  };

  const statuGuncelle = async (stajyer, yeniStatu) => {
    const { error } = await supabase
      .from("stajyerler")
      .update({ statu: yeniStatu })
      .eq("id", stajyer.id);

    if (error) {
      setDialog({
        type: "info",
        title: "Hata",
        message: "Statu degistirilemedi: " + error.message,
      });
      return;
    }

    await stajyerleriGetir();
    setDialog(null);
    bildirim("Statu guncellendi.");
  };

  const tarihYaz = (tarih) => {
    if (!tarih) return "Tarih yok";
    return new Date(tarih).toLocaleDateString("tr-TR");
  };

  const gunHesapla = (baslangic, bitis) => {
    if (!baslangic || !bitis) return 0;
    const fark = new Date(bitis) - new Date(baslangic);
    if (fark < 0) return 0;
    return Math.floor(fark / (1000 * 60 * 60 * 24)) + 1;
  };

  const filtreliListe = useMemo(() => {
    return stajyerler.filter((s) => {
      const metin = `${s.ad || ""} ${s.soyad || ""} ${s.departman || ""}`.toLowerCase();
      const aramaUygun = metin.includes(arama.toLowerCase());
      const filtreUygun = filtre === "all" || s.statu === filtre;
      return aramaUygun && filtreUygun;
    });
  }, [stajyerler, arama, filtre]);

  const t = {
    tr: {
      title: "Stajyer Takip Paneli",
      subtitle: "Stajyer kayıtlarını, tarihlerini, fotoğraflarını ve durumlarını tek panelden yönetin.",
      all: "Tümü",
      total: "Toplam Stajyer",
      planned: "Planlanan",
      active: "Devam Eden",
      completed: "Tamamlanan",
      newRecord: "Yeni Stajyer Kaydı",
      newDesc: "Bilgileri doldurup fotoğraf seçerek yeni kayıt oluşturun.",
      name: "İsim",
      surname: "Soyisim",
      department: "Departman",
      start: "Başlangıç Tarihi",
      end: "Bitiş Tarihi",
      photo: "Fotoğraf Seç",
      photoSelected: "Fotoğraf seçildi ✅",
      uploading: "Fotoğraf yükleniyor...",
      save: "Kayıt Oluştur",
      saving: "Kaydediliyor...",
      search: "Stajyer ara...",
      changeStatus: "Statü Değiştir",
      delete: "Sil",
      cancel: "Vazgeç",
      ok: "Tamam",
      card: "STAJYER KARTI",
      status: "Statü",
      startLabel: "Başlangıç",
      endLabel: "Bitiş",
      duration: "Toplam Süre",
      details: "Detayları Gör",
      day: "gün",
      theme: "Tema",
      dark: "Karanlık",
      light: "Aydınlık",
    },
    en: {
      title: "Intern Tracking Panel",
      subtitle: "Manage intern records, dates, photos and statuses from one dashboard.",
      all: "All",
      total: "Total Interns",
      planned: "Planned",
      active: "In Progress",
      completed: "Completed",
      newRecord: "New Intern Record",
      newDesc: "Fill in the details and select a photo to create a new record.",
      name: "Name",
      surname: "Surname",
      department: "Department",
      start: "Start Date",
      end: "End Date",
      photo: "Select Photo",
      photoSelected: "Photo selected ✅",
      uploading: "Uploading photo...",
      save: "Create Record",
      saving: "Saving...",
      search: "Search intern...",
      changeStatus: "Change Status",
      delete: "Delete",
      cancel: "Cancel",
      ok: "OK",
      card: "INTERN CARD",
      status: "Status",
      startLabel: "Start",
      endLabel: "End",
      duration: "Total Duration",
      details: "View Details",
      day: "days",
      theme: "Theme",
      dark: "Dark",
      light: "Light",
    },
  }[dil];

  const statuEtiketleri = {
    "Staj Planlandı": t.planned,
    "Devam Ediyor": t.active,
    "Tamamlandı": t.completed,
  };

  const filtreSecenekleri = [
    { value: "all", label: t.all },
    { value: "Staj Planlandı", label: t.planned },
    { value: "Devam Ediyor", label: t.active },
    { value: "Tamamlandı", label: t.completed },
  ];

  const statuSecenekleri = filtreSecenekleri.slice(1);

  return (
    <div className="app-shell">
      {dialog && (
        <div className="dialog-backdrop" role="presentation" onClick={() => setDialog(null)}>
          <div className="dialog" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="dialog-close" onClick={() => setDialog(null)} aria-label="Kapat">
              x
            </button>

            <div className="dialog-head">
              <span>{dialog.type === "status" ? "Durum" : dialog.type === "details" ? "Detay" : "Bilgi"}</span>
              <h2>{dialog.title}</h2>
              {dialog.message && <p>{dialog.message}</p>}
            </div>

            {dialog.type === "details" && dialog.stajyer && (
              <div className="dialog-details">
                <div>
                  <b>Departman</b>
                  <span>{dialog.stajyer.departman || "Departman girilmedi"}</span>
                </div>
                <div>
                  <b>{t.status}</b>
                  <span>{statuEtiketleri[dialog.stajyer.statu] || t.planned}</span>
                </div>
                <div>
                  <b>{t.startLabel}</b>
                  <span>{tarihYaz(dialog.stajyer.baslangic_tarihi)}</span>
                </div>
                <div>
                  <b>{t.endLabel}</b>
                  <span>{tarihYaz(dialog.stajyer.bitis_tarihi)}</span>
                </div>
                <div>
                  <b>{t.duration}</b>
                  <span>
                    {gunHesapla(dialog.stajyer.baslangic_tarihi, dialog.stajyer.bitis_tarihi)} {t.day}
                  </span>
                </div>
              </div>
            )}

            {dialog.type === "status" && dialog.stajyer && (
              <div className="status-options">
                {statuSecenekleri.map((secenek) => (
                  <button
                    key={secenek.value}
                    type="button"
                    className={dialog.stajyer.statu === secenek.value ? "selected" : ""}
                    onClick={() => statuGuncelle(dialog.stajyer, secenek.value)}
                  >
                    {secenek.label}
                  </button>
                ))}
              </div>
            )}

            <div className="dialog-actions">
              {dialog.type === "delete" && dialog.stajyer ? (
                <>
                  <button type="button" className="secondary" onClick={() => setDialog(null)}>
                    {t.cancel}
                  </button>
                  <button type="button" className="danger" onClick={() => stajyerSilOnayla(dialog.stajyer)}>
                    Sil
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => setDialog(null)}>
                  {t.ok}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <main className="page">
        <section className="hero">
          <div className="hero-top">
            <span>STAJ YÖNETİMİ</span>
            <div className="theme-controls">
              <button type="button" onClick={() => setTema(tema === "dark" ? "light" : "dark")}>
                {tema === "dark" ? t.dark : t.light}
              </button>
              <select value={dil} onChange={(e) => setDil(e.target.value)} aria-label="Dil secimi">
                <option value="tr">TR</option>
                <option value="en">EN</option>
              </select>
            </div>
          </div>
          <div className="hero-content">
            <h1>{t.title}</h1>
            <p>{t.subtitle}</p>
          </div>
        </section>

        <section className="stats">
          <div className="stat-card">
            <span>{t.total}</span>
            <strong>{stajyerler.length}</strong>
          </div>
          <div className="stat-card">
            <span>{t.planned}</span>
            <strong>{stajyerler.filter((s) => s.statu === "Staj Planlandı").length}</strong>
          </div>
          <div className="stat-card">
            <span>{t.active}</span>
            <strong>{stajyerler.filter((s) => s.statu === "Devam Ediyor").length}</strong>
          </div>
          <div className="stat-card">
            <span>{t.completed}</span>
            <strong>{stajyerler.filter((s) => s.statu === "Tamamlandı").length}</strong>
          </div>
        </section>

        <section className="panel">
          <div className="panel-title">
            <div>
              <h2>{t.newRecord}</h2>
              <p>{t.newDesc}</p>
            </div>
          </div>

          <form className="form" onSubmit={stajyerEkle}>
            <input placeholder={t.name} value={form.ad} onChange={(e) => setForm({ ...form, ad: e.target.value })} />
            <input placeholder={t.surname} value={form.soyad} onChange={(e) => setForm({ ...form, soyad: e.target.value })} />
            <input placeholder={t.department} value={form.departman} onChange={(e) => setForm({ ...form, departman: e.target.value })} />

            <DatePicker
              selected={form.baslangic_tarihi ? new Date(form.baslangic_tarihi) : null}
              onChange={(date) =>
                setForm({
                  ...form,
                  baslangic_tarihi: tarihFormatla(date),
                  bitis_tarihi: "",
                })
              }
              dateFormat="dd.MM.yyyy"
              placeholderText={t.start}
              className="date-input"
              withPortal
            />

            <DatePicker
              selected={form.bitis_tarihi ? new Date(form.bitis_tarihi) : null}
              onChange={(date) =>
                setForm({
                  ...form,
                  bitis_tarihi: tarihFormatla(date),
                })
              }
              minDate={form.baslangic_tarihi ? new Date(form.baslangic_tarihi) : null}
              dateFormat="dd.MM.yyyy"
              placeholderText={t.end}
              className="date-input"
              withPortal
            />

            <label className="file-input">
              {fotoYukleniyor
                ? t.uploading
                : form.foto_url
                ? t.photoSelected
                : t.photo}
              <input type="file" accept="image/*" onChange={fotografYukle} />
            </label>

            <button type="submit" disabled={fotoYukleniyor || kayitYapiliyor}>
              {kayitYapiliyor ? t.saving : t.save}
            </button>
          </form>
        </section>

        <section className="toolbar">
          <input
            placeholder={t.search}
            value={arama}
            onChange={(e) => setArama(e.target.value)}
          />

          <div className="tabs">
            {filtreSecenekleri.map((item) => (
              <button
                key={item.value}
                className={filtre === item.value ? "selected" : ""}
                onClick={() => setFiltre(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        <section className="grid">
          {filtreliListe.map((stajyer) => (
            <article className="card" key={stajyer.id}>
              <button
                type="button"
                className="delete-icon"
                onClick={() => stajyerSil(stajyer)}
                aria-label="Kaydi sil"
                title={t.delete}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M9 3h6l1 2h4v2H4V5h4l1-2Z" />
                  <path d="M6 9h12l-1 12H7L6 9Zm4 2v8h2v-8h-2Zm4 0v8h2v-8h-2Z" />
                </svg>
              </button>
              <div className="avatar">
                {stajyer.foto_url ? (
                  <img src={stajyer.foto_url} alt={`${stajyer.ad} ${stajyer.soyad}`} />
                ) : (
                  <span>
                    {stajyer.ad?.charAt(0)}
                    {stajyer.soyad?.charAt(0)}
                  </span>
                )}
              </div>

              <small className="card-label">{t.card}</small>

              <h3>
                {stajyer.ad} {stajyer.soyad}
              </h3>

              <p>{stajyer.departman || "Departman girilmedi"}</p>

              <span
                className={`badge ${
                  stajyer.statu === "Tamamlandı"
                    ? "done"
                    : stajyer.statu === "Devam Ediyor"
                    ? "active"
                    : ""
                }`}
              >
                {statuEtiketleri[stajyer.statu] || t.planned}
              </span>

              <div className="date-box">
                <div>
                  <b>Başlangıç</b>
                  <span>{tarihYaz(stajyer.baslangic_tarihi)}</span>
                  <span>{tarihYaz(stajyer.bitis_tarihi)}</span>
                </div>
                <div>
                  <b>Bitiş</b>
                  <span>{gunHesapla(stajyer.baslangic_tarihi, stajyer.bitis_tarihi)} {t.day}</span>
                </div>
              </div>

              <div className="actions">
                <button type="button" className="secondary" onClick={() => detaylariGor(stajyer)}>
                  {t.details}
                </button>
                <button onClick={() => statuDegistir(stajyer)}>{t.changeStatus}</button>
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}

export default App;

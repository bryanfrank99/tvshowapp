using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Windows.Forms;

namespace TVShow.Installer
{
    public class ChunkInfo
    {
        public string Name { get; set; }
        public long Size { get; set; }
        public string Sha256 { get; set; }
    }

    public class Manifest
    {
        public string AppName { get; set; }
        public string Version { get; set; }
        public string TargetFile { get; set; }
        public long TotalSize { get; set; }
        public int TotalChunks { get; set; }
        public string Sha256 { get; set; }
        public List<ChunkInfo> Chunks { get; set; }

        public Manifest()
        {
            AppName = "TVShow";
            Version = "7.15.0";
            TargetFile = "TVShow-Setup.exe";
            Chunks = new List<ChunkInfo>();
        }

        public static Manifest Parse(string json)
        {
            var m = new Manifest();

            var mApp = Regex.Match(json, "\"app\"\\s*:\\s*\"([^\"]+)\"");
            if (mApp.Success) m.AppName = mApp.Groups[1].Value;

            var mVer = Regex.Match(json, "\"version\"\\s*:\\s*\"([^\"]+)\"");
            if (mVer.Success) m.Version = mVer.Groups[1].Value;

            var mTarget = Regex.Match(json, "\"targetFile\"\\s*:\\s*\"([^\"]+)\"");
            if (mTarget.Success) m.TargetFile = mTarget.Groups[1].Value;

            var mTotal = Regex.Match(json, "\"totalSize\"\\s*:\\s*(\\d+)");
            if (mTotal.Success) m.TotalSize = long.Parse(mTotal.Groups[1].Value);

            var mSha = Regex.Match(json, "\"sha256\"\\s*:\\s*\"([a-fA-F0-9]{64})\"");
            if (mSha.Success) m.Sha256 = mSha.Groups[1].Value;

            // Extraer bloques de chunks
            var chunkMatches = Regex.Matches(json, "\\{\\s*\"name\"\\s*:\\s*\"([^\"]+)\"\\s*,\\s*\"size\"\\s*:\\s*(\\d+)(?:\\s*,\\s*\"sha256\"\\s*:\\s*\"([^\"]+)\")?\\s*\\}");
            foreach (Match cm in chunkMatches)
            {
                var c = new ChunkInfo
                {
                    Name = cm.Groups[1].Value,
                    Size = long.Parse(cm.Groups[2].Value),
                    Sha256 = cm.Groups[3].Success ? cm.Groups[3].Value : ""
                };
                m.Chunks.Add(c);
            }
            m.TotalChunks = m.Chunks.Count;

            if (m.TotalSize == 0 && m.Chunks.Count > 0)
            {
                foreach (var ch in m.Chunks) m.TotalSize += ch.Size;
            }

            return m;
        }
    }

    public class CustomProgressBar : Control
    {
        private float _percentage = 0f;
        public float Percentage
        {
            get { return _percentage; }
            set
            {
                _percentage = Math.Max(0f, Math.Min(100f, value));
                Invalidate();
            }
        }

        public CustomProgressBar()
        {
            SetStyle(ControlStyles.UserPaint | ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer, true);
            Height = 18;
            BackColor = Color.FromArgb(22, 25, 38);
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;

            // Fondo de la barra
            using (var brush = new SolidBrush(BackColor))
            {
                e.Graphics.FillRectangle(brush, ClientRectangle);
            }

            // Barra de progreso (azul TVShow #008CFF con gradiente)
            if (_percentage > 0)
            {
                int fillWidth = (int)((Width * _percentage) / 100f);
                if (fillWidth > 0)
                {
                    var rect = new Rectangle(0, 0, fillWidth, Height);
                    using (var fillBrush = new LinearGradientBrush(rect, Color.FromArgb(0, 140, 255), Color.FromArgb(0, 195, 255), 0F))
                    {
                        e.Graphics.FillRectangle(fillBrush, rect);
                    }
                }
            }

            // Borde exterior
            using (var pen = new Pen(Color.FromArgb(40, 45, 65), 1))
            {
                e.Graphics.DrawRectangle(pen, 0, 0, Width - 1, Height - 1);
            }
        }
    }

    public class InstallerForm : Form
    {
        private const string DEFAULT_BASE_URL = "https://tvshow.freedev.app/apps/";
        private string _baseUrl;
        private string _tempDir;
        private string _outputFilePath;
        private Manifest _manifest;
        private Thread _workerThread;
        private bool _isCancelled = false;
        private int _currentChunkIndex = 0;

        // UI Controls
        private Label lblTitle;
        private Label lblSubtitle;
        private Label lblStatus;
        private Label lblDetails;
        private Label lblSpeed;
        private CustomProgressBar progressBar;
        private Button btnCancel;
        private Button btnRetry;
        private Button btnClose;
        private Button btnMinimize;
        private Panel headerPanel;

        // Arrastrar ventana
        private bool _dragging = false;
        private Point _dragCursorPoint;
        private Point _dragFormPoint;

        public InstallerForm(string[] args)
        {
            _baseUrl = DEFAULT_BASE_URL;
            if (args != null)
            {
                foreach (var arg in args)
                {
                    if (arg.StartsWith("/url=", StringComparison.OrdinalIgnoreCase))
                    {
                        _baseUrl = arg.Substring(5).Trim();
                    }
                }
            }

            if (!_baseUrl.EndsWith("/")) _baseUrl += "/";

            InitializeComponent();
            ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12 | SecurityProtocolType.Tls11 | SecurityProtocolType.Tls;
        }

        private void InitializeComponent()
        {
            this.SuspendLayout();

            this.Text = "TVShow - Instalador Web";
            this.Size = new Size(520, 310);
            this.FormBorderStyle = FormBorderStyle.None;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.BackColor = Color.FromArgb(14, 15, 23); // #0e0f17
            this.ForeColor = Color.White;

            // Panel superior (Encabezado)
            headerPanel = new Panel
            {
                Dock = DockStyle.Top,
                Height = 36,
                BackColor = Color.FromArgb(18, 20, 32)
            };
            headerPanel.MouseDown += Header_MouseDown;
            headerPanel.MouseMove += Header_MouseMove;
            headerPanel.MouseUp += Header_MouseUp;

            var lblHeaderTitle = new Label
            {
                Text = "TVShow Setup",
                ForeColor = Color.FromArgb(160, 165, 185),
                Font = new Font("Segoe UI", 9F, FontStyle.Bold),
                Location = new Point(14, 9),
                AutoSize = true
            };
            lblHeaderTitle.MouseDown += Header_MouseDown;
            lblHeaderTitle.MouseMove += Header_MouseMove;
            lblHeaderTitle.MouseUp += Header_MouseUp;
            headerPanel.Controls.Add(lblHeaderTitle);

            btnMinimize = new Button
            {
                Text = "–",
                Size = new Size(32, 28),
                Location = new Point(448, 4),
                FlatStyle = FlatStyle.Flat,
                ForeColor = Color.FromArgb(180, 185, 200),
                BackColor = Color.Transparent,
                Font = new Font("Segoe UI", 10F, FontStyle.Bold),
                Cursor = Cursors.Hand
            };
            btnMinimize.FlatAppearance.BorderSize = 0;
            btnMinimize.Click += (s, e) => this.WindowState = FormWindowState.Minimized;
            headerPanel.Controls.Add(btnMinimize);

            btnClose = new Button
            {
                Text = "✕",
                Size = new Size(32, 28),
                Location = new Point(482, 4),
                FlatStyle = FlatStyle.Flat,
                ForeColor = Color.FromArgb(180, 185, 200),
                BackColor = Color.Transparent,
                Font = new Font("Segoe UI", 9F),
                Cursor = Cursors.Hand
            };
            btnClose.FlatAppearance.BorderSize = 0;
            btnClose.Click += (s, e) => CancelAndExit();
            headerPanel.Controls.Add(btnClose);

            this.Controls.Add(headerPanel);

            // Contenido Principal
            lblTitle = new Label
            {
                Text = "TVSHOW",
                Font = new Font("Segoe UI", 20F, FontStyle.Bold),
                ForeColor = Color.White,
                Location = new Point(28, 52),
                AutoSize = true
            };
            this.Controls.Add(lblTitle);

            lblSubtitle = new Label
            {
                Text = "Instalador en línea oficial para Windows",
                Font = new Font("Segoe UI", 9.5F, FontStyle.Regular),
                ForeColor = Color.FromArgb(0, 140, 255),
                Location = new Point(30, 88),
                AutoSize = true
            };
            this.Controls.Add(lblSubtitle);

            lblStatus = new Label
            {
                Text = "Iniciando conexión con el servidor...",
                Font = new Font("Segoe UI", 9F, FontStyle.Regular),
                ForeColor = Color.FromArgb(210, 215, 230),
                Location = new Point(30, 130),
                Size = new Size(460, 22)
            };
            this.Controls.Add(lblStatus);

            progressBar = new CustomProgressBar
            {
                Location = new Point(30, 156),
                Size = new Size(460, 18)
            };
            this.Controls.Add(progressBar);

            lblDetails = new Label
            {
                Text = "Preparando descarga...",
                Font = new Font("Segoe UI", 8.5F, FontStyle.Regular),
                ForeColor = Color.FromArgb(140, 145, 165),
                Location = new Point(30, 182),
                Size = new Size(270, 20)
            };
            this.Controls.Add(lblDetails);

            lblSpeed = new Label
            {
                Text = "0%",
                Font = new Font("Segoe UI", 8.5F, FontStyle.Bold),
                ForeColor = Color.FromArgb(0, 195, 255),
                Location = new Point(310, 182),
                Size = new Size(180, 20),
                TextAlign = ContentAlignment.TopRight
            };
            this.Controls.Add(lblSpeed);

            // Botones inferiores
            btnCancel = new Button
            {
                Text = "Cancelar",
                Size = new Size(100, 34),
                Location = new Point(390, 245),
                FlatStyle = FlatStyle.Flat,
                ForeColor = Color.FromArgb(200, 205, 220),
                BackColor = Color.FromArgb(26, 29, 44),
                Font = new Font("Segoe UI", 9F, FontStyle.Bold),
                Cursor = Cursors.Hand
            };
            btnCancel.FlatAppearance.BorderColor = Color.FromArgb(45, 50, 75);
            btnCancel.Click += (s, e) => CancelAndExit();
            this.Controls.Add(btnCancel);

            btnRetry = new Button
            {
                Text = "Reintentar",
                Size = new Size(105, 34),
                Location = new Point(275, 245),
                FlatStyle = FlatStyle.Flat,
                ForeColor = Color.White,
                BackColor = Color.FromArgb(0, 140, 255),
                Font = new Font("Segoe UI", 9F, FontStyle.Bold),
                Cursor = Cursors.Hand,
                Visible = false
            };
            btnRetry.FlatAppearance.BorderSize = 0;
            btnRetry.Click += (s, e) =>
            {
                btnRetry.Visible = false;
                StartDownloadProcess();
            };
            this.Controls.Add(btnRetry);

            this.Paint += (s, e) =>
            {
                using (var pen = new Pen(Color.FromArgb(35, 40, 60), 1))
                {
                    e.Graphics.DrawRectangle(pen, 0, 0, this.Width - 1, this.Height - 1);
                }
            };

            this.ResumeLayout(false);
            this.PerformLayout();
        }

        protected override void OnShown(EventArgs e)
        {
            base.OnShown(e);
            StartDownloadProcess();
        }

        private void Header_MouseDown(object sender, MouseEventArgs e)
        {
            if (e.Button == MouseButtons.Left)
            {
                _dragging = true;
                _dragCursorPoint = Cursor.Position;
                _dragFormPoint = this.Location;
            }
        }

        private void Header_MouseMove(object sender, MouseEventArgs e)
        {
            if (_dragging)
            {
                Point diff = Point.Subtract(Cursor.Position, new Size(_dragCursorPoint));
                this.Location = Point.Add(_dragFormPoint, new Size(diff));
            }
        }

        private void Header_MouseUp(object sender, MouseEventArgs e)
        {
            _dragging = false;
        }

        private void StartDownloadProcess()
        {
            _isCancelled = false;
            _workerThread = new Thread(DownloadThreadWorker)
            {
                IsBackground = true
            };
            _workerThread.Start();
        }

        private void UpdateUI(Action action)
        {
            if (this.IsDisposed || !this.IsHandleCreated) return;
            try
            {
                this.Invoke(action);
            }
            catch { }
        }

        private void DownloadThreadWorker()
        {
            try
            {
                UpdateUI(() =>
                {
                    lblStatus.Text = "Conectando al repositorio de instalación...";
                    lblStatus.ForeColor = Color.FromArgb(210, 215, 230);
                    btnRetry.Visible = false;
                });

                // 1. Descargar manifest.json
                string manifestUrl = _baseUrl + "manifest.json";
                string jsonContent = null;

                using (var client = new WebClient())
                {
                    client.Headers.Add("User-Agent", "TVShow-WebInstaller");
                    try
                    {
                        byte[] data = client.DownloadData(manifestUrl);
                        jsonContent = Encoding.UTF8.GetString(data);
                    }
                    catch (Exception ex)
                    {
                        throw new Exception("No se pudo obtener el archivo manifest.json desde " + manifestUrl + " (" + ex.Message + ")");
                    }
                }

                _manifest = Manifest.Parse(jsonContent);

                if (_manifest.Chunks == null || _manifest.Chunks.Count == 0)
                {
                    throw new Exception("El archivo manifest.json no contiene fragmentos válidos para descargar.");
                }

                UpdateUI(() =>
                {
                    lblSubtitle.Text = "Instalando TVShow v" + _manifest.Version;
                    lblStatus.Text = "Iniciando descarga (" + _manifest.TotalChunks + " fragmentos de ~2 MB)...";
                });

                // 2. Preparar directorio temporal
                _tempDir = Path.Combine(Path.GetTempPath(), "TVShow_Setup_" + Process.GetCurrentProcess().Id);
                if (!Directory.Exists(_tempDir))
                {
                    Directory.CreateDirectory(_tempDir);
                }

                _outputFilePath = Path.Combine(_tempDir, string.IsNullOrEmpty(_manifest.TargetFile) ? "TVShow-Setup.exe" : _manifest.TargetFile);

                long totalBytes = _manifest.TotalSize;
                long totalDownloaded = 0;
                var stopwatch = Stopwatch.StartNew();
                long lastBytes = 0;
                double currentSpeed = 0;

                // Abrir archivo final para ensamblaje continuo
                using (var outputStream = new FileStream(_outputFilePath, FileMode.OpenOrCreate, FileAccess.Write, FileShare.None))
                {
                    // Si ya se habían descargado fragmentos previos, posicionar al final
                    totalDownloaded = outputStream.Length;
                    outputStream.Seek(totalDownloaded, SeekOrigin.Begin);

                    for (int i = _currentChunkIndex; i < _manifest.Chunks.Count; i++)
                    {
                        if (_isCancelled) return;

                        _currentChunkIndex = i;
                        var chunk = _manifest.Chunks[i];
                        string chunkUrl = _baseUrl + chunk.Name;

                        UpdateUI(() =>
                        {
                            lblStatus.Text = string.Format("Descargando componentes: parte {0} de {1} ({2})...", i + 1, _manifest.TotalChunks, chunk.Name);
                        });

                        var req = (HttpWebRequest)WebRequest.Create(chunkUrl);
                        req.UserAgent = "TVShow-WebInstaller";
                        req.Timeout = 30000;
                        req.ReadWriteTimeout = 30000;

                        using (var resp = req.GetResponse())
                        using (var stream = resp.GetResponseStream())
                        {
                            byte[] buffer = new byte[65536];
                            int read;
                            while ((read = stream.Read(buffer, 0, buffer.Length)) > 0)
                            {
                                if (_isCancelled) return;

                                outputStream.Write(buffer, 0, read);
                                totalDownloaded += read;

                                // Calcular velocidad cada 500ms
                                if (stopwatch.ElapsedMilliseconds >= 500)
                                {
                                    double seconds = stopwatch.ElapsedMilliseconds / 1000.0;
                                    long delta = totalDownloaded - lastBytes;
                                    currentSpeed = (delta / seconds) / (1024.0 * 1024.0); // MB/s
                                    lastBytes = totalDownloaded;
                                    stopwatch.Restart();
                                }

                                float percent = totalBytes > 0 ? (float)((totalDownloaded * 100.0) / totalBytes) : 0f;
                                double mbDownloaded = totalDownloaded / (1024.0 * 1024.0);
                                double mbTotal = totalBytes / (1024.0 * 1024.0);

                                UpdateUI(() =>
                                {
                                    progressBar.Percentage = percent;
                                    lblDetails.Text = string.Format("{0:F1} MB / {1:F1} MB ({2:F1} MB/s)", mbDownloaded, mbTotal, currentSpeed);
                                    lblSpeed.Text = string.Format("{0:F0}%", percent);
                                });
                            }
                        }

                        outputStream.Flush();
                    }
                }

                // 3. Verificación de Integridad
                UpdateUI(() =>
                {
                    progressBar.Percentage = 100f;
                    lblStatus.Text = "Verificando integridad del instalador ensamblado...";
                    lblSpeed.Text = "100%";
                });

                var fi = new FileInfo(_outputFilePath);
                if (!fi.Exists || fi.Length < 1024 * 1024)
                {
                    throw new Exception("El archivo ensamblado está incompleto o dañado.");
                }

                // Comprobar firma PE de Windows (MZ)
                using (var fs = new FileStream(_outputFilePath, FileMode.Open, FileAccess.Read))
                {
                    byte[] mz = new byte[2];
                    fs.Read(mz, 0, 2);
                    if (mz[0] != 0x4D || mz[1] != 0x5A) // 'M', 'Z'
                    {
                        throw new Exception("El archivo ensamblado no es un ejecutable válido de Windows.");
                    }
                }

                // 4. Lanzar instalación
                UpdateUI(() =>
                {
                    lblStatus.Text = "Iniciando instalación de TVShow...";
                    lblDetails.Text = "Abriendo el asistente de instalación...";
                });

                Thread.Sleep(800);

                var startInfo = new ProcessStartInfo
                {
                    FileName = _outputFilePath,
                    UseShellExecute = true
                };
                Process.Start(startInfo);

                Thread.Sleep(1200);

                UpdateUI(() =>
                {
                    Application.Exit();
                });
            }
            catch (Exception ex)
            {
                if (_isCancelled) return;

                UpdateUI(() =>
                {
                    lblStatus.Text = "Error durante la descarga.";
                    lblStatus.ForeColor = Color.FromArgb(255, 90, 90);
                    lblDetails.Text = ex.Message;
                    btnRetry.Visible = true;
                });
            }
        }

        private void CancelAndExit()
        {
            _isCancelled = true;
            try
            {
                if (_workerThread != null && _workerThread.IsAlive)
                {
                    _workerThread.Abort();
                }
            }
            catch { }

            // Limpiar archivos temporales
            try
            {
                if (!string.IsNullOrEmpty(_tempDir) && Directory.Exists(_tempDir))
                {
                    Directory.Delete(_tempDir, true);
                }
            }
            catch { }

            Application.Exit();
        }

        [STAThread]
        public static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new InstallerForm(args));
        }
    }
}

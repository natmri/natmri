use byteorder::{BigEndian, LittleEndian, ReadBytesExt};
use std::{
    fs,
    io::{Cursor, Read, Seek},
    path::Path,
};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum WPPkgFsError {
    #[error("Not a valid WPPkgFs file header")]
    InvalidFileHeader,
}

pub(crate) enum Endian {
    BigEndian,
    LittleEndian,
}

pub(crate) struct FsBinaryStream {
    inner: Cursor<fs::File>,
    endian: Endian,
}

impl FsBinaryStream {
    pub fn new<P>(filepath: P) -> Self
    where
        P: AsRef<Path>,
    {
        let file = fs::File::open(filepath).unwrap();
        Self {
            inner: Cursor::new(file),
            endian: Endian::LittleEndian,
        }
    }

    pub fn get_position(&self) -> u64 {
        self.inner.position()
    }

    pub fn set_position(&mut self, pos: u64) {
        self.inner.set_position(pos);
    }

    pub fn read_sized_string(&mut self) -> String {
        let len = self.read_u32() as usize;
        let mut buf = vec![0; len];
        self.inner.get_mut().read_exact(&mut buf).unwrap();
        String::from_utf8(buf).unwrap()
    }

    pub fn read_i32(&mut self) -> i32 {
        match self.endian {
            Endian::BigEndian => self.inner.get_mut().read_i32::<BigEndian>().unwrap(),
            Endian::LittleEndian => self.inner.get_mut().read_i32::<LittleEndian>().unwrap(),
        }
    }

    pub fn read_u32(&mut self) -> u32 {
        match self.endian {
            Endian::BigEndian => self.inner.get_mut().read_u32::<BigEndian>().unwrap(),
            Endian::LittleEndian => self.inner.get_mut().read_u32::<LittleEndian>().unwrap(),
        }
    }

    pub fn read_u64(&mut self) -> u64 {
        match self.endian {
            Endian::BigEndian => self.inner.get_mut().read_u64::<BigEndian>().unwrap(),
            Endian::LittleEndian => self.inner.get_mut().read_u64::<LittleEndian>().unwrap(),
        }
    }

    pub fn read_u8(&mut self) -> u8 {
        self.inner.get_mut().read_u8().unwrap()
    }

    pub fn read_u16(&mut self) -> u16 {
        match self.endian {
            Endian::BigEndian => self.inner.get_mut().read_u16::<BigEndian>().unwrap(),
            Endian::LittleEndian => self.inner.get_mut().read_u16::<LittleEndian>().unwrap(),
        }
    }

    pub fn reposition(&mut self) {
        self.set_position(0);
    }

    pub fn read(&mut self, buf: &mut [u8]) {
        self.inner.get_mut().read_exact(buf).unwrap();
    }
}

#[derive(Debug)]
struct PkgFile {
    path: String,
    offset: u64,
    length: u64,
}

impl PkgFile {
    pub fn new(path: String, offset: u64, length: u64) -> Self {
        Self {
            path,
            offset,
            length,
        }
    }
}

#[derive(Debug)]
pub(crate) struct WPPkgFs {
    pub path: String,
    pub files: Vec<PkgFile>,
}

impl WPPkgFs {
    fn new(path: String) -> Self {
        Self {
            path,
            files: vec![],
        }
    }

    fn push_file(&mut self, file: PkgFile) {
        self.files.push(file);
    }
}

impl WPPkgFs {
    pub fn parse(filepath: &str) -> Result<WPPkgFs, WPPkgFsError> {
        let mut stream = FsBinaryStream::new(filepath);
        let ver = stream.read_sized_string();

        if !ver.starts_with("PKG") {
            return Err(WPPkgFsError::InvalidFileHeader);
        }

        let entry_count = stream.read_u32();
        let mut pkgfiles = vec![];
        for _ in 0..entry_count {
            let path = format!("/{}", stream.read_sized_string());
            let offset: u64 = stream.read_u32().into();
            let length: u64 = stream.read_u32().into();
            let pkgfile = PkgFile::new(path, offset, length);
            pkgfiles.push(pkgfile);
        }

        let mut pkgfs = WPPkgFs::new(filepath.to_string());
        for mut el in pkgfiles {
            el.offset += stream.get_position();
            // let len = el.length as usize;
            // let mut buf = vec![0; len];
            // stream.read(&mut buf);
            // el.content = buf;
            pkgfs.push_file(el);
        }

        Ok(pkgfs)
    }

    pub fn contains(&self, path: &str) -> bool {
        self.files.iter().any(|f| f.path == path)
    }

    pub fn open(&self, path: &str) -> Option<LimitedBinaryStream> {
        let mut pkg = FsBinaryStream::new(self.path.as_str());

        if self.contains(path) {
            let file = self.files.iter().find(|f| f.path == path).unwrap();
            return Some(LimitedBinaryStream::new(pkg, file.offset, file.length));
        }

        None
    }
}

struct LimitedBinaryStream {
    inner: FsBinaryStream,
}

impl LimitedBinaryStream {
    pub fn new(mut pkg: FsBinaryStream, offset: u64, length: u64) -> Self {
        let inner = pkg.inner.get_mut();
        inner
            .seek(std::io::SeekFrom::Start(offset))
            .expect("seek error");
        inner
            .seek(std::io::SeekFrom::End((offset + length) as i64))
            .expect("seek error");
        Self { inner: pkg }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const PKG_FILE_PATH: &str = "./fixtures/2862745478/scene.pkg";

    #[test]
    fn test_with_parser() {
        let pkgfs = WPPkgFs::parse(PKG_FILE_PATH).unwrap();

        println!("{}", pkgfs.files.len());
    }
}

from fastapi import HTTPException, Depends
from sqlalchemy.orm import Session
from database import get_db
from entities.DatasetImage import DatasetImageEntity

# Questa funzione sostituisce la classe CogPathResolver
def GetCogPath(image_id: str, db: Session = Depends(get_db)) -> str:
    # 1. Cerchiamo l'immagine nel DB
    oImage = db.query(DatasetImageEntity).filter(DatasetImageEntity.id == image_id).first()
    
    if not oImage:
        raise HTTPException(status_code=404, detail="Image ID not found")
    
    # 2. Restituiamo il percorso locale (es. C:/WASDI/...)
    # TiTiler si aspetta che la dipendenza 'path_dependency' restituisca 
    # un oggetto che abbia un attributo .url o che sia una stringa (a seconda della versione)
    return oImage.link

# Per rendere TiTiler felice, creiamo una piccola classe wrapper 
# che simula DatasetPathParams ma con il tuo ID
class CogIdParams:
    def __init__(self, dataset_id: str, db: Session = Depends(get_db)):
        oImage = db.query(DatasetImageEntity).filter(DatasetImageEntity.id == dataset_id).first()
        if not oImage:
            raise HTTPException(status_code=404, detail="Image ID not found")
        self.url = oImage.link
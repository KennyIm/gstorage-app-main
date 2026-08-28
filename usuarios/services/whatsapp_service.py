import re
import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

def normalizar_telefono_chile(telefono_raw: str) -> str:
    if not telefono_raw:
        return ''
    digitos = re.sub(r'\D', '', str(telefono_raw))
    if len(digitos) == 9 and digitos.startswith('9'):
        return f"56{digitos}"
    if len(digitos) == 11 and digitos.startswith('569'):
        return digitos
    return digitos

def enviar_otp_whatsapp(telefono_raw: str, codigo_otp: str, nombre_operativo: str = "Operador") -> bool:
    numero = normalizar_telefono_chile(telefono_raw)
    if not numero:
        logger.error(f"[WhatsApp] Teléfono no válido: {telefono_raw}")
        return False

    config = settings.WHATSAPP_GATEWAY_CONFIG
    url = f"{config['URL']}/message/sendText/{config['INSTANCE']}"
    
    headers = {
        "apikey": config['API_KEY'],
        "Content-Type": "application/json"
    }

    cuerpo_mensaje = (
        f"*GStorage - Control Operativo*\n\n"
        f"Hola *{nombre_operativo}*, tu código de acceso express es:\n\n"
        f"*{codigo_otp}*\n\n"
        f"_Válido por 5 minutos. No compartas este código con terceros._"
    )

    payload = {
        "number": numero,
        "text": cuerpo_mensaje,
        "options": {
            "delay": 1000,
            "presence": "composing"
        }
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=config.get('TIMEOUT', 5))
        
        if response.status_code in [200, 201]:
            logger.info(f"[WhatsApp] OTP entregado exitosamente a {numero}")
            return True

        logger.error(f"[WhatsApp Error] Gateway respondió HTTP {response.status_code}: {response.text}")
        
    except requests.exceptions.RequestException as e:
        logger.warning(f"[WhatsApp Offline] Gateway no disponible ({config['URL']}): {str(e)}")

    if getattr(settings, 'DEBUG', False):
        print("\n" + "="*50)
        print(f"🔥 [DEV OTP BYPASS] Operador: {nombre_operativo}")
        print(f"📱 Teléfono: {numero}")
        print(f"🔑 Código OTP: {codigo_otp}")
        print("="*50 + "\n")
        return True

    return False
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import path from 'path'

export async function createPdf (data, constantImages, type) {
  const outputFolderPath = './pdf' // Output folder path

  try {
    // Create output folder if it doesn't exist
    if (!existsSync(outputFolderPath)) {
      mkdirSync(outputFolderPath, { recursive: true })
    }

    // Construct the output PDF path
    const outputPdfPath = path.join(
      outputFolderPath,
      `${data.orderId}-${type}.pdf`
    )

    const pdfDoc = await PDFDocument.create()

    const page = pdfDoc.addPage([595.28, 841.89])

    // Add text to the PDF
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold) // Bold font
    const fontSizeTitle = 20 // Font size for the title "ORDER DETAILS"
    const fontSizeLabel = 13 // Font size for labels
    const fontSizeValue = 13 // Font size for values

    // Define the margins and paddings
    const margin = 20 // Margin size in points
    const labelValuePadding = -26 // Padding between label and value in points
    const imagePadding = 10 // Padding between images in points
    const topMarginTitle = 55 // Top margin for the title
    const topMarginContent = 34 // Top margin for labels and values

    // Calculate center positions
    const contentWidth = 595.28 - 2 * margin // Content width excluding margins
    const labelWidth = 100 // Fixed width for labels
    const centerSpace = labelValuePadding * 2 // Space between label and value
    const labelCenter = margin + (contentWidth - labelWidth - centerSpace) / 2
    const valueCenter = labelCenter + labelWidth + centerSpace // Position for values

    // Determine the title based on the type
    const titleText = type === 'karigar' ? 'JOB CARD' : 'ORDER DETAILS'

    // Draw the title
    const titleWidth = boldFont.widthOfTextAtSize(titleText, fontSizeTitle)
    const titleX = margin + (contentWidth - titleWidth) / 2
    const titleY = 841.89 - margin - topMarginTitle // Adjusted for top margin
    page.drawText(titleText, {
      x: titleX,
      y: titleY,
      size: fontSizeTitle,
      font: boldFont,
      color: rgb(0, 0, 0)
    })

    // Line spacing after title
    let yPosition = titleY - fontSizeTitle - topMarginContent

    const orderDetails = [
      { label: 'OrderId', value: data.orderId },
      {
        label: type === 'karigar' ? 'Karigar Name' : 'Customer Name',
        value: data.customerName
      },
      { label: 'Order Date', value: data.orderDate },
      { label: 'Product Name', value: data.productName },
      { label: 'Delivery Date', value: data.deliveryDate },
      { label: 'Purity', value: data.purity },
      { label: 'Weight', value: data.weight },
      { label: 'Size/Length', value: data.size },
      { label: 'Quantity', value: data.quantity },
      {
        label: 'Specification',
        value: data.specification,
        multiline: true,
        maxLength: 40,
        maxLines: 5
      }
    ]

    const wrapText = (text, maxLength, maxLines) => {
      const regex = new RegExp(`.{1,${maxLength}}`, 'g')
      const lines = text.match(regex) || []
      return lines.slice(0, maxLines)
    }

    orderDetails.forEach(detail => {
      // Draw label
      const labelY = yPosition
      page.drawText(`${detail.label}:-`, {
        x: 70,
        y: labelY,
        size: fontSizeLabel,
        font: boldFont, // Use boldFont for labels
        color: rgb(0, 0, 0),
        align: 'right' // Align label to the right of the center
      })

      // Draw value
      const textOptions = {
        x: valueCenter,
        y: labelY,
        size: fontSizeValue,
        font: font,
        color: rgb(0, 0, 0),
        align: 'left' // Align value to the left of the center
      }

      if (detail.multiline) {
        const lines = wrapText(detail.value, detail.maxLength, detail.maxLines)
        lines.forEach((line, index) => {
          page.drawText(line, {
            ...textOptions,
            y: textOptions.y - (fontSizeValue + 2) * index
          })
        })
        yPosition = textOptions.y - (fontSizeValue + 2) * lines.length - 10
      } else {
        page.drawText(detail.value, textOptions)
        yPosition -= fontSizeValue + 3 // Adjust spacing between lines
      }

      // Move to the next line
      yPosition -= 10 // Line spacing between label-value pairs
    })

    // Calculate image size and position
    const imageSize = 170 // Maximum size for images
    const imagePositions = [
      { x: margin + 10, y: yPosition - 175 },
      { x: margin + 190, y: yPosition - 175 },
      { x: margin + 370, y: yPosition - 175 },
      { x: margin + 70, y: yPosition - 350 },
      { x: margin + 300, y: yPosition - 350 }
    ]

    // Add constant images to the PDF
    for (let i = 0; i < constantImages.length; i++) {
      const imageBytes = readFileSync(constantImages[i].path)
      let image
      if (
        constantImages[i].type === 'jpg' ||
        constantImages[i].type === 'jpeg'
      ) {
        image = await pdfDoc.embedJpg(imageBytes)
      } else if (constantImages[i].type === 'png') {
        image = await pdfDoc.embedPng(imageBytes)
      }

      const { width, height } = image
      let finalWidth = width
      let finalHeight = height

      // Calculate scaling factors
      const scaleX = imageSize / width
      const scaleY = imageSize / height
      const scale = Math.min(scaleX, scaleY)

      finalWidth = width * scale
      finalHeight = height * scale

      // Stretch smaller images to fit imageSize
      if (width < imageSize && height < imageSize) {
        finalWidth = imageSize
        finalHeight = imageSize
      }

      const xOffset = (imageSize - finalWidth) / 2
      const yOffset = (imageSize - finalHeight) / 2

      const finalX = imagePositions[i].x + xOffset
      const finalY = imagePositions[i].y + yOffset

      if (finalY < margin) {
        throw new Error(
          'Not enough space to fit all images within the margins of the page.'
        )
      }

      page.drawImage(image, {
        x: finalX,
        y: finalY,
        width: finalWidth,
        height: finalHeight
      })
    }

    // Draw border around the content
    const borderWidth = 595.28 - 2 * margin // Content width
    const borderHeight = 841.89 - 2 * margin // Content height
    const borderWidthLine = 2 // Border width

    page.drawRectangle({
      x: margin,
      y: margin,
      width: borderWidth,
      height: borderHeight,
      borderWidth: borderWidthLine,
      borderColor: rgb(0, 0, 0)
    })

    // Serialize the PDFDocument to bytes (a Uint8Array)
    const pdfBytes = await pdfDoc.save()

    // Write the PDF to a file
    writeFileSync(outputPdfPath, pdfBytes)

    console.log('PDF created successfully')

    return outputPdfPath;
  } catch (error) {
    console.log('Error creating PDF:', error)
  }
}
